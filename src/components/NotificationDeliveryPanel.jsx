import { APP_VERSION } from '@/lib/appVersion';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, Send } from 'lucide-react';
import { charityClient } from '@/api/charityClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { formatISTDateTime } from '@/lib/dateTime';

const PAGE_SIZE = 20;

function Counts({ title, data }) {
  const entries = Object.entries(data || {});
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">None</p>
      ) : (
        entries.map(([key, value]) => (
          <p key={key} className="text-sm text-slate-700 flex justify-between">
            <span className="capitalize">{key.replace(/_/g, ' ')}</span>
            <span className="font-semibold">{value}</span>
          </p>
        ))
      )}
    </div>
  );
}

export default function NotificationDeliveryPanel() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sendingId, setSendingId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['notification-delivery-overview', search, page],
    queryFn: () =>
      charityClient.admin.notificationDeliveryOverview({
        search: search || undefined,
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      }),
  });

  const sendTest = async (userId) => {
    setSendingId(userId);
    try {
      const result = await charityClient.notifications.sendTestPush(userId);
      const sent = Number(result?.sent ?? 0);
      toast({
        title: sent > 0 ? 'Test sent' : 'Not delivered',
        description: sent > 0 ? `Delivered to ${sent} device(s).` : 'This user has no working device.',
        variant: sent > 0 ? undefined : 'destructive',
      });
    } catch (error) {
      toast({ title: 'Test failed', description: error?.message, variant: 'destructive' });
    } finally {
      setSendingId(null);
    }
  };

  const total = Number(data?.total || 0);
  const users = data?.users || [];

  return (
    <div className="space-y-4">
      {data && !data.web_push_configured && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Web push is not configured on the server (VAPID keys missing). Only in-app notifications work.
        </p>
      )}
      {data?.scope === 'own' && (
        <p className="text-xs text-slate-500">Showing your own devices only.</p>
      )}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Counts title="Active devices by role" data={data.by_role} />
          <Counts title="By device type" data={data.by_device_type} />
          <Counts title="Permission" data={data.permission_states} />
          <Counts title="Display mode" data={data.display_modes} />
        </div>
      )}
      {data && (
        <p className="text-sm text-slate-600">
          Failed pushes in the last 7 days: <strong>{data.failures_last_7_days}</strong>
        </p>
      )}

      {data?.latest_app_version && (
        <div className="rounded-lg border border-slate-200 p-3 space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-slate-800">App version in use</p>
            <p className="text-xs text-slate-500">
              This device: <span className="font-mono">{APP_VERSION}</span>
              {APP_VERSION === data.latest_app_version ? ' (newest)' : ''}
            </p>
          </div>
          <p className="text-sm text-slate-600">
            <strong>{data.users_on_latest_version}</strong> user(s) have opened the newest version{' '}
            <span className="font-mono text-xs">{data.latest_app_version}</span>.
            Others update when they open the app and tap <em>Update now</em>.
          </p>
          <div className="space-y-1">
            {Object.entries(data.by_app_version || {})
              .sort(([a], [b]) => (a === 'not reported' ? 1 : b === 'not reported' ? -1 : b.localeCompare(a)))
              .map(([version, count]) => (
                <p key={version} className="flex justify-between text-xs text-slate-600">
                  <span className="font-mono">{version}{version === data.latest_app_version ? ' · newest' : ''}</span>
                  <span className="font-semibold">{count}</span>
                </p>
              ))}
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search by name or username"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      ) : users.length === 0 ? (
        <p className="text-sm text-slate-500">No users found.</p>
      ) : (
        <div className="space-y-2">
          {users.map((row) => (
            <div key={row.user_id} className="rounded-lg border border-slate-200 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">{row.full_name || row.username}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {row.role} · permission: {row.notification_permission || 'unknown'} · {row.device_display_mode || 'unknown'}
                    {' · '}
                    <span className={row.on_latest_version ? 'text-emerald-700' : 'text-amber-700'}>
                      {row.app_version ? (row.on_latest_version ? 'newest version' : `old version ${row.app_version}`) : 'version not reported'}
                    </span>
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => sendTest(row.user_id)} disabled={sendingId === row.user_id}>
                  {sendingId === row.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                  Send test
                </Button>
              </div>
              {row.devices.length === 0 ? (
                <p className="text-xs text-slate-400">No registered devices</p>
              ) : (
                row.devices.map((device, index) => (
                  <div key={`${row.user_id}-${index}`} className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{device.type}</Badge>
                    <span>{device.label}</span>
                    <Badge className={device.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                      {device.is_active ? 'active' : 'inactive'}
                    </Badge>
                    {device.last_success_at && <span>Last delivered {formatISTDateTime(device.last_success_at)}</span>}
                    {device.last_failure_at && (
                      <span className="text-rose-600">
                        Failed {formatISTDateTime(device.last_failure_at)}
                        {device.last_failure_reason ? ` (${device.last_failure_reason})` : ''}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-slate-500">{page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of {total}</span>
          <Button size="sm" variant="outline" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
