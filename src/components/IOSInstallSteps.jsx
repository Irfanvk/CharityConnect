import { Share, PlusSquare, Smartphone } from 'lucide-react';

/** Three-step Add-to-Home-Screen guide, plus the iOS version limit. */
export function IOSInstallSteps({ unsupported = false }) {
  if (unsupported) {
    return (
      <p className="text-xs text-amber-700">
        Notifications on iPhone need iOS 16.4 or newer. Update iOS in Settings → General → Software Update,
        then install the app from Safari. You will still see updates inside the app.
      </p>
    );
  }
  return (
    <div className="space-y-2 text-xs text-slate-600">
      <p>Notifications reach iPhone only through the installed app (iOS 16.4+). Three steps:</p>
      <ol className="space-y-1.5">
        <li className="flex items-center gap-2">
          <Share className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>1. In Safari, tap <strong>Share</strong>.</span>
        </li>
        <li className="flex items-center gap-2">
          <PlusSquare className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>2. Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</span>
        </li>
        <li className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>3. Open the app from the new home-screen icon and turn notifications on.</span>
        </li>
      </ol>
    </div>
  );
}
