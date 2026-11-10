import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openInstallDialog, useInstallState } from '@/lib/installPrompt';

/**
 * Opens the install dialog (one-tap install or browser-specific steps).
 * Hidden once the app is installed or running as the installed app.
 * variant="menu" renders a sidebar menu row instead of a header button.
 */
export default function PWAInstallButton({ className = '', variant = 'header', onOpen }) {
  const { installed, standalone } = useInstallState();
  if (installed || standalone) return null;

  const handleClick = () => {
    onOpen?.();
    openInstallDialog();
  };

  if (variant === 'menu') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`flex w-full items-center gap-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 px-4 py-3 text-left text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-900/40 select-none ${className}`.trim()}
      >
        <Download className="h-5 w-5" />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">Install app</span>
          <span className="block truncate text-xs text-emerald-700/80 dark:text-emerald-300/80">Add to your home screen</span>
        </span>
      </button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className={`inline-flex ${className}`.trim()}
      aria-label="Install app"
      title="Install app"
    >
      <Download className="w-4 h-4 sm:mr-2" />
      <span className="hidden sm:inline">Install app</span>
    </Button>
  );
}
