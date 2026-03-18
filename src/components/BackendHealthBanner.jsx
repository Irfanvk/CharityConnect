import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { checkBackendHealth } from '@/lib/healthCheck';

const RETRY_INTERVAL_MS = 8000;

export function BackendHealthBanner() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let retryTimer = null;

    const check = async () => {
      const ok = await checkBackendHealth();
      if (ok) {
        setFading(true);
        setTimeout(() => setVisible(false), 600);
      } else {
        setVisible(true);
        retryTimer = setTimeout(check, RETRY_INTERVAL_MS);
      }
    };

    check();
    return () => clearTimeout(retryTimer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-sm flex items-center justify-center gap-2 py-2 px-4 transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      <span>Connecting to server… please wait</span>
    </div>
  );
}
