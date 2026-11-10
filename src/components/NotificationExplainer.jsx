import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { safeLocalStorage } from '@/lib/device';
import { enableNotificationsFromTap, getPushEnvironment } from '@/lib/pushSetup';
import { useInstallState } from '@/lib/installPrompt';

const DISMISS_KEY = 'notification_explainer_dismissed';

/**
 * One-time explainer shown after login. Permission is requested only when the
 * user taps the button, and never inside an iOS Safari tab.
 */
export default function NotificationExplainer() {
  const { isAuthenticated } = useAuth();
  const [hidden, setHidden] = useState(() => safeLocalStorage(DISMISS_KEY) === '1');
  const [busy, setBusy] = useState(false);
  const { dialogOpen: installDialogOpen } = useInstallState();

  // Never stack on top of the install dialog; it shows again once that closes.
  if (!isAuthenticated || hidden || installDialogOpen) return null;
  const env = getPushEnvironment();
  if (env.state !== 'ready' || env.permission !== 'default') return null;

  const dismiss = () => {
    safeLocalStorage(DISMISS_KEY, '1');
    setHidden(true);
  };

  const enable = async () => {
    setBusy(true);
    try {
      await enableNotificationsFromTap();
      window.dispatchEvent(new Event('charityhub:push-permission-changed'));
    } catch {
      // The Settings card shows details if something is wrong.
    } finally {
      setBusy(false);
      dismiss();
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">Get payment updates instantly</p>
          <p className="text-xs text-slate-500 mt-1">
            We will tell you when a payment is approved or needs attention. You can change this any time in Notification settings.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={enable} disabled={busy}>Enable notifications</Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>Not now</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
