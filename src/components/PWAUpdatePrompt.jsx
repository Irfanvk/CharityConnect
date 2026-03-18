import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { isIOSDevice } from '@/lib/device';

export function PWAUpdatePrompt() {
  const [hidden, setHidden] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  // iOS skips SW entirely — no point showing the prompt
  if (isIOSDevice() || !needRefresh || hidden) return null;

  const handleUpdate = () => {
    updateServiceWorker(true);
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-white border-l-4 border-emerald-600 rounded-xl shadow-2xl p-4 flex items-center justify-between gap-3 max-w-lg mx-auto">
      <p className="text-sm text-slate-700 font-medium flex-1">
        A new version of CharityConnect is available.
      </p>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleUpdate}
          className="text-sm font-semibold text-white bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Update now
        </button>
        <button
          onClick={() => setHidden(true)}
          className="text-sm font-medium text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}
