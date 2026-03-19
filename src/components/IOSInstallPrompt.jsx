import { useState } from 'react';
import { Share } from 'lucide-react';
import { isIOSDevice, isStandalone, safeLocalStorage } from '@/lib/device';

const DISMISS_KEY = 'ios_install_dismissed';

export function IOSInstallPrompt() {
  const [dismissed, setDismissed] = useState(
    () => safeLocalStorage(DISMISS_KEY) === '1'
  );

  if (!isIOSDevice() || isStandalone() || dismissed) return null;

  const handleDismiss = () => {
    safeLocalStorage(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-xl shadow-2xl border-t border-slate-200 p-5 pb-6 safe-area-bottom">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 mt-0.5">
          <Share className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-800 text-sm">Add CharityHub to your home screen</p>
          <p className="text-slate-500 text-xs mt-1">
            Open in Safari → tap <strong>Share</strong> <span aria-label="share icon">↑</span> → tap <strong>"Add to Home Screen"</strong>
          </p>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="mt-4 w-full text-center text-sm font-medium text-emerald-600 py-2 rounded-lg hover:bg-emerald-50 transition-colors"
      >
        Got it
      </button>
    </div>
  );
}
