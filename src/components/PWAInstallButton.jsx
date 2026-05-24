import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function PWAInstallButton({ className = '' }) {
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    setIsInstalled(standalone);

    const userAgent = window.navigator.userAgent || '';
    const isIos = /iPad|iPhone|iPod/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS/.test(userAgent);
    setIsIosSafari(isIos && isSafari);

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const shouldRender = useMemo(() => {
    if (isInstalled) return false;
    return Boolean(deferredPrompt) || isIosSafari;
  }, [deferredPrompt, isInstalled, isIosSafari]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome !== 'accepted') {
        toast({
          title: 'Install canceled',
          description: 'You can install the app anytime from this button.',
        });
      }

      setDeferredPrompt(null);
      return;
    }

    if (isIosSafari) {
      toast({
        title: 'Install on iPhone/iPad',
        description: 'Tap Share, then choose Add to Home Screen.',
      });
    }
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleInstall}
      className={`inline-flex ${className}`.trim()}
      aria-label="Install PMB GCC PORTAL app"
      title="Install PMB GCC PORTAL app"
    >
      <Download className="w-4 h-4 mr-2" />
      Install PMB GCC PORTAL
    </Button>
  );
}
