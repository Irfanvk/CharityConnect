import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Loader2, Moon, Send, Smartphone } from 'lucide-react';
import { charityClient } from '@/api/charityClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import PaymentReminderSetting from '@/components/PaymentReminderSetting';
import { useToast } from '@/components/ui/use-toast';
import { IOSInstallSteps } from '@/components/IOSInstallSteps';
import { enableNotificationsFromTap, getPushEnvironment } from '@/lib/pushSetup';

const CATEGORY_LABELS = {
  payment_updates: ['Payment updates', 'Approved, rejected or changed payments'],
  reminders: ['Reminders', 'Monthly payment reminders'],
  announcements: ['Announcements', 'Messages from the administrators'],
  admin_payment_reviews: ['Payments to review', 'New payment proofs waiting for approval'],
  admin_requests: ['Requests to review', 'Member and password-reset requests'],
  admin_fund_approvals: ['Fund approvals', 'Fund utilization waiting for approval'],
};

export function DeniedHelp({ platform }) {
  const steps = {
    ios: 'Open iPhone Settings → Notifications → this app, then switch Allow Notifications on.',
    android: 'Tap the lock icon in the address bar (or long-press the app icon) → Permissions → Notifications → Allow.',
    desktop: 'Click the lock icon next to the address bar → Site settings → Notifications → Allow, then reload.',
  };
  return (
    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
      Notifications are blocked for this app. {steps[platform] || steps.desktop}
    </p>
  );
}

export default function NotificationSettingsCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [env, setEnv] = useState(() => getPushEnvironment());
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [quiet, setQuiet] = useState({ enabled: false, start: '22:00', end: '07:00' });

  const { data, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => charityClient.notifications.getPreferences(),
  });

  useEffect(() => {
    if (data?.quiet_hours) {
      setQuiet({
        enabled: Boolean(data.quiet_hours.enabled),
        start: data.quiet_hours.start || '22:00',
        end: data.quiet_hours.end || '07:00',
      });
    }
  }, [data]);

  const save = async (payload) => {
    try {
      const next = await charityClient.notifications.savePreferences(payload);
      queryClient.setQueryData(['notification-preferences'], next);
    } catch (error) {
      toast({ title: 'Could not save', description: error?.message || 'Please try again.', variant: 'destructive' });
    }
  };

  const enable = async () => {
    setBusy(true);
    try {
      const result = await enableNotificationsFromTap();
      window.dispatchEvent(new Event('charityhub:push-permission-changed'));
      setEnv(getPushEnvironment());
      if (result.status === 'subscribed') {
        toast({ title: 'Notifications are on for this device' });
      } else if (result.status === 'denied') {
        toast({ title: 'Notifications are blocked', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Could not enable notifications', description: error?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const result = await charityClient.notifications.sendTestPush();
      const sent = Number(result?.sent ?? 0);
      toast({
        title: sent > 0 ? 'Test notification sent' : 'No device received it',
        description: sent > 0 ? `Sent to ${sent} device(s).` : 'Enable notifications on this device first.',
        variant: sent > 0 ? undefined : 'destructive',
      });
    } catch (error) {
      toast({ title: 'Test failed', description: error?.message, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  const categories = data?.categories || {};

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
          {env.permission === 'granted' ? <Bell className="w-4 h-4 text-emerald-600" /> : <BellOff className="w-4 h-4 text-slate-400" />}
          This device: {env.permission === 'granted' ? 'notifications on' : env.permission === 'denied' ? 'blocked' : 'notifications off'}
        </div>
        {env.state === 'ios-install' && <IOSInstallSteps />}
        {env.state === 'ios-unsupported' && <IOSInstallSteps unsupported />}
        {env.state === 'unsupported' && (
          <p className="text-xs text-slate-500">This browser cannot receive push notifications. You will still see updates in the app.</p>
        )}
        {env.state === 'ready' && env.permission === 'denied' && <DeniedHelp platform={env.platform} />}
        {env.state === 'ready' && env.permission !== 'denied' && (
          <div className="flex flex-wrap gap-2">
            {env.permission !== 'granted' && (
              <Button size="sm" onClick={enable} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Smartphone className="w-4 h-4 mr-1" />}
                Enable on this device
              </Button>
            )}
            {env.permission === 'granted' && (
              <Button size="sm" variant="outline" onClick={sendTest} disabled={testing}>
                {testing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                Send test to my devices
              </Button>
            )}
          </div>
        )}
      </div>

      {data?.payment_reminder?.applies && (
        <PaymentReminderSetting
          enabled={data.payment_reminder.enabled}
          day={data.payment_reminder.day}
          disabled={!data.payment_reminder.organisation_enabled}
          onChange={({ enabled, day }) => save({
            ...(enabled !== undefined ? { payment_reminder_enabled: enabled } : {}),
            ...(day !== undefined ? { payment_reminder_day: day } : {}),
          })}
        />
      )}
      {data?.payment_reminder?.applies && !data.payment_reminder.organisation_enabled && (
        <p className="-mt-3 text-xs text-slate-500">Reminders are currently paused by the admins.</p>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-800">What to notify me about</p>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        ) : (
          Object.keys(categories).map((key) => {
            const [label, hint] = CATEGORY_LABELS[key] || [key, ''];
            return (
              <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500">{hint}</p>
                </div>
                <Switch
                  checked={Boolean(categories[key])}
                  onCheckedChange={(checked) => save({ categories: { [key]: checked } })}
                  aria-label={label}
                />
              </div>
            );
          })
        )}
        <p className="text-xs text-slate-500">Security alerts (password or role changes) are always delivered.</p>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-slate-500" />
            <div>
              <p className="text-sm text-slate-800">Quiet hours</p>
              <p className="text-xs text-slate-500">Pushes wait until quiet hours end. Times are India time (IST).</p>
            </div>
          </div>
          <Switch
            checked={quiet.enabled}
            onCheckedChange={(checked) => {
              setQuiet((q) => ({ ...q, enabled: checked }));
              save({ quiet_hours_enabled: checked, quiet_hours_start: quiet.start, quiet_hours_end: quiet.end });
            }}
            aria-label="Quiet hours"
          />
        </div>
        {quiet.enabled && (
          <div className="flex items-center gap-2 text-sm">
            <Input
              type="time"
              value={quiet.start}
              className="w-32"
              onChange={(e) => setQuiet((q) => ({ ...q, start: e.target.value }))}
              onBlur={() => save({ quiet_hours_start: quiet.start, quiet_hours_end: quiet.end })}
            />
            <span>to</span>
            <Input
              type="time"
              value={quiet.end}
              className="w-32"
              onChange={(e) => setQuiet((q) => ({ ...q, end: e.target.value }))}
              onBlur={() => save({ quiet_hours_start: quiet.start, quiet_hours_end: quiet.end })}
            />
            <span className="text-xs text-slate-500">IST</span>
          </div>
        )}
      </div>
    </div>
  );
}
