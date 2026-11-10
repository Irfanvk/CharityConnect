import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Download, Wallet } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { useAuth } from "@/lib/AuthContext";
import { useOrgBrand } from "@/lib/branding";
import { formatMemberId } from "@/lib/utils";
import { PAGE_PATHS } from "@/config/appPaths";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { dismissInstallForThisLogin, openInstallDialog, useInstallState } from "@/lib/installPrompt";
import { enableNotificationsFromTap, getPushEnvironment } from "@/lib/pushSetup";

function monthLabel(value) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return "";
  const [y, m] = value.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

// Users who closed the welcome in this page session. The layout remounts on
// navigation and the auth store ignores welcome_pending changes, so this keeps
// it from reappearing before the "seen" call has reached the server.
const closedForUsers = new Set();

/**
 * Shown once, on the first visit after an admin approves a member's
 * self-activation (user.welcome_pending). Closing it marks it as seen.
 */
export default function ActivationWelcome() {
  const { user, isAuthenticated, setAuthenticatedUser } = useAuth();
  const orgBrand = useOrgBrand();
  const navigate = useNavigate();
  const install = useInstallState();
  const [summary, setSummary] = useState(null);
  const [open, setOpen] = useState(false);
  const [notifyBusy, setNotifyBusy] = useState(false);

  const pending = Boolean(isAuthenticated && user?.welcome_pending && !closedForUsers.has(user?.id));

  useEffect(() => {
    if (!pending) return undefined;
    let alive = true;
    // The welcome has its own "Install the app" button; don't stack the install popup on top.
    dismissInstallForThisLogin();
    charityClient.auth.welcome()
      .then((data) => {
        if (alive && data?.show) {
          setSummary(data);
          setOpen(true);
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [pending]);

  const finish = () => {
    if (user?.id != null) closedForUsers.add(user.id);
    setOpen(false);
    charityClient.auth.welcomeSeen().catch(() => {});
    if (user) setAuthenticatedUser({ ...user, welcome_pending: false });
  };

  const goPay = () => {
    finish();
    navigate(PAGE_PATHS.CHALLANS);
  };

  const goInstall = () => {
    finish();
    setTimeout(openInstallDialog, 250);
  };

  const pushEnv = getPushEnvironment();
  const canAskNotifications = pushEnv.state === "ready" && pushEnv.permission === "default";
  const turnOnNotifications = async () => {
    setNotifyBusy(true);
    try {
      await enableNotificationsFromTap();
      window.dispatchEvent(new Event("charityhub:push-permission-changed"));
    } catch {
      // Notification settings show details if something is wrong.
    } finally {
      setNotifyBusy(false);
    }
  };

  if (!summary) return null;
  const firstName = String(summary.full_name || "").trim().split(/\s+/)[0];
  const since = monthLabel(summary.first_month);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && finish()}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        <div className="relative bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 px-6 pb-8 pt-10 text-center text-white">
          <div className="pointer-events-none absolute inset-0 opacity-25"
            style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #fde68a 0 3px, transparent 4px), radial-gradient(circle at 80% 30%, #fff 0 2px, transparent 3px), radial-gradient(circle at 60% 80%, #fde68a 0 2px, transparent 3px)", backgroundSize: "60px 60px" }} />
          <div className="relative">
            <div className="mx-auto mb-3 text-5xl" aria-hidden="true">🎉</div>
            <p className="text-sm font-medium text-emerald-100">Assalamu Alaikum</p>
            <DialogTitle className="mt-1 text-2xl font-bold text-white">
              Welcome{firstName ? `, ${firstName}` : ""}!
            </DialogTitle>
            <DialogDescription className="mt-2 text-emerald-50">
              Your {orgBrand.name} account is active. Thank you for being part of our community.
            </DialogDescription>
            {summary.member_code && (
              <span className="mt-4 inline-block rounded-full bg-white/15 px-3 py-1 font-mono text-sm tracking-wide">
                {formatMemberId(summary.member_code)}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{summary.months_paid}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">months contributed</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">₹{Number(summary.total_paid || 0).toLocaleString()}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">total given</p>
            </div>
          </div>
          {since && (
            <p className="text-center text-sm text-slate-600 dark:text-slate-300">
              Your payment history since <strong>{since}</strong> is ready to view. May Allah reward your generosity.
            </p>
          )}

          <div className="space-y-2">
            <Button className="w-full justify-start bg-emerald-600 hover:bg-emerald-700" onClick={goPay}>
              <Wallet className="mr-2 h-4 w-4" /> Pay this month
            </Button>
            {!install.standalone && !install.installed && install.installSupported && (
              <Button variant="outline" className="w-full justify-start" onClick={goInstall}>
                <Download className="mr-2 h-4 w-4" /> Install the app
              </Button>
            )}
            {canAskNotifications && (
              <Button variant="outline" className="w-full justify-start" onClick={turnOnNotifications} disabled={notifyBusy}>
                <Bell className="mr-2 h-4 w-4" /> Turn on notifications
              </Button>
            )}
            <Button variant="ghost" className="w-full" onClick={finish}>Explore the portal</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
