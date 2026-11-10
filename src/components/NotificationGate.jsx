import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellOff, CheckCircle2, Download, Loader2 } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { useAuth } from "@/lib/AuthContext";
import { safeLocalStorage } from "@/lib/device";
import { enableNotificationsFromTap, getPushEnvironment } from "@/lib/pushSetup";
import { currentLoginId, openInstallDialog, shouldAutoShowInstall, useInstallState } from "@/lib/installPrompt";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { DeniedHelp } from "@/components/NotificationSettingsCard";

/*
 * "Turn on notifications" is a required step after every sign-in until this
 * device has notifications on. "Later" only hides it until the next login.
 * Browsers never let a site switch notifications on by itself, so the person
 * still has to tap Allow; where push is impossible (old iPhone, unsupported
 * browser) nothing is shown.
 */

const DISMISSED_KEY = "notification_gate_dismissed_login_id";
const NO_GATE_PATHS = ["/login", "/register", "/activate", "/forgotpassword", "/resetpassword"];
const SHOW_DELAY_MS = 1500;
const PERMISSION_EVENT = "charityhub:push-permission-changed";

// Tiny store so the dialog and the "notifications are off" bar share one state.
let gateOpen = false;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());
export function openNotificationGate() { gateOpen = true; emit(); }
function closeNotificationGate() { gateOpen = false; emit(); }
function useGateOpen() {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, () => gateOpen, () => gateOpen);
}

/** Current push environment, refreshed when permission may have changed. */
export function usePushEnvironment() {
  const [env, setEnv] = useState(() => getPushEnvironment());
  useEffect(() => {
    const refresh = () => setEnv(getPushEnvironment());
    window.addEventListener(PERMISSION_EVENT, refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener(PERMISSION_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return env;
}

/** True when this device should get notifications but does not yet. */
export function useNotificationsMissing() {
  const { isAuthenticated } = useAuth();
  const env = usePushEnvironment();
  const { data: pushConfig } = useQuery({
    queryKey: ["push-public-key"],
    queryFn: () => charityClient.notifications.getPushPublicKey(),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });
  const serverReady = Boolean(pushConfig?.enabled);
  const needsAction = env.state === "ios-install" || (env.state === "ready" && env.permission !== "granted");
  return { missing: Boolean(isAuthenticated && serverReady && needsAction), env };
}

export default function NotificationGate() {
  const location = useLocation();
  const { toast } = useToast();
  const install = useInstallState();
  const open = useGateOpen();
  const { missing, env } = useNotificationsMissing();
  const [busy, setBusy] = useState(false);
  const [justDenied, setJustDenied] = useState(false);

  const onAuthPage = NO_GATE_PATHS.includes(location.pathname.toLowerCase());
  // Wait for the other first-run dialogs (install popup, setup form, welcome).
  const othersBusy = install.dialogOpen || install.autoHeld || shouldAutoShowInstall(install);

  useEffect(() => {
    if (!missing || onAuthPage || open || othersBusy) return undefined;
    if (safeLocalStorage(DISMISSED_KEY) === currentLoginId()) return undefined;
    const timer = setTimeout(openNotificationGate, SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [missing, onAuthPage, open, othersBusy]);

  // Close by itself once notifications are on (e.g. allowed from browser settings).
  useEffect(() => {
    if (open && !missing) closeNotificationGate();
  }, [open, missing]);

  const later = useCallback(() => {
    safeLocalStorage(DISMISSED_KEY, currentLoginId());
    setJustDenied(false);
    closeNotificationGate();
  }, []);

  const turnOn = async () => {
    setBusy(true);
    try {
      const result = await enableNotificationsFromTap();
      window.dispatchEvent(new Event(PERMISSION_EVENT));
      if (result.status === "subscribed" || result.permission === "granted") {
        closeNotificationGate();
        toast({ title: "Notifications are on", description: "You'll get payment updates and reminders on this device." });
      } else if (result.status === "denied") {
        setJustDenied(true);
      }
    } catch (error) {
      toast({ title: "Could not turn on notifications", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const installFirst = () => {
    closeNotificationGate();
    setTimeout(openInstallDialog, 200);
  };

  const blocked = env.permission === "denied" || justDenied;
  const iosInstall = env.state === "ios-install";

  return (
    <Dialog open={open && missing} onOpenChange={(next) => { if (!next) later(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader className="items-center text-center">
          <div className={`mb-2 flex h-14 w-14 items-center justify-center rounded-full ${blocked ? "bg-amber-100" : "bg-emerald-100"}`}>
            {blocked ? <BellOff className="h-7 w-7 text-amber-600" /> : <Bell className="h-7 w-7 text-emerald-600" />}
          </div>
          <DialogTitle className="text-center">
            {blocked ? "Notifications are blocked" : "Turn on notifications"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {iosInstall
              ? "On iPhone, notifications work only from the installed app. Install it first, then turn them on there."
              : "This is how you'll know when a payment is approved, a reminder is due or the admins need you."}
          </DialogDescription>
        </DialogHeader>

        {!blocked && !iosInstall && (
          <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
            {["Payment approved or needs attention", "Monthly payment reminders", "Announcements and replies to your requests"].map((text) => (
              <li key={text} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {text}
              </li>
            ))}
          </ul>
        )}

        {blocked && (
          <div className="space-y-2">
            <DeniedHelp platform={env.platform} />
            <p className="text-xs text-slate-500">Then come back here; this closes by itself once they're allowed.</p>
          </div>
        )}

        <div className="space-y-2 pt-1">
          {iosInstall ? (
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={installFirst}>
              <Download className="mr-2 h-4 w-4" /> Install the app
            </Button>
          ) : !blocked ? (
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={turnOn} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
              Turn on notifications
            </Button>
          ) : (
            <Button className="w-full" variant="outline" onClick={() => window.dispatchEvent(new Event(PERMISSION_EVENT))}>
              I've allowed them – check again
            </Button>
          )}
          <Button variant="ghost" className="w-full text-slate-500" onClick={later}>
            Later
          </Button>
          <p className="text-center text-xs text-slate-400">"Later" asks again at your next sign-in.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Slim reminder shown on the Dashboard until this device has notifications on. */
export function NotificationsOffBar() {
  const { missing, env } = useNotificationsMissing();
  if (!missing) return null;
  const blocked = env.permission === "denied";
  return (
    <button
      type="button"
      onClick={openNotificationGate}
      className="mb-4 flex w-full items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 shadow-sm hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <BellOff className="h-5 w-5 shrink-0 text-amber-600" />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">Notifications are {blocked ? "blocked" : "off"} on this device</span>
        <span className="block text-xs text-amber-800/80 dark:text-amber-200/80">You may miss payment updates and reminders.</span>
      </span>
      <span className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">
        {env.state === "ios-install" ? "Install" : blocked ? "Fix" : "Turn on"}
      </span>
    </button>
  );
}
