import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { isIOSDevice, isStandalone, safeLocalStorage } from '@/lib/device';

const DISMISS_KEY = 'android_install_dismissed';

export function AndroidInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(
    () => safeLocalStorage(DISMISS_KEY) === '1'
  );

  useEffect(() => {
    if (isIOSDevice() || isStandalone()) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleLater = () => {
    safeLocalStorage(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-xl shadow-2xl border-t border-slate-200 p-5 pb-6">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 mt-0.5">
          <Heart className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-800 text-sm">Install CharityConnect</p>
          <p className="text-slate-500 text-xs mt-0.5">Add to your home screen for quick access</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleInstall}
          className="flex-1 bg-emerald-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Install
        </button>
        <button
          onClick={handleLater}
          className="flex-1 bg-slate-100 text-slate-700 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-200 transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}
