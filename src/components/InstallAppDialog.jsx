import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Check, Copy, Download, ExternalLink, Menu, MoreHorizontal, MoreVertical,
  PlusSquare, Share, Smartphone,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useOrgBrand } from '@/lib/branding';
import { useAuth } from '@/lib/AuthContext';
import { APP_IMAGES } from '@/config/appPaths';
import {
  closeInstallDialog, dismissInstallForThisLogin, markInstalled, openInstallDialog, promptInstall,
  shouldAutoShowInstall, useInstallState,
} from '@/lib/installPrompt';

const AUTO_SHOW_DELAY_MS = 2500;
const NO_AUTO_SHOW_PATHS = ['/login', '/register', '/forgotpassword', '/resetpassword'];

const B = ({ children }) => <strong className="font-semibold text-slate-900 dark:text-slate-100">{children}</strong>;

/** Steps for the user's exact browser. `primary` is the main button: 'prompt' | 'copy' | null. */
function getInstructions(state) {
  const { platform, browser, inAppName, canPrompt, iosNeedsSafari, installSupported } = state;

  if (browser === 'inapp') {
    const target = platform === 'ios' ? 'Safari' : 'Chrome';
    return {
      intro: `You opened this link inside ${inAppName}. Apps can't be installed from here, so open it in ${target} first.`,
      steps: platform === 'ios'
        ? [
            [MoreHorizontal, <>Tap the <B>•••</B> or <B>Share</B> button (top or bottom corner).</>],
            [ExternalLink, <>Choose <B>Open in Safari</B> (or <B>Open in browser</B>).</>],
            [PlusSquare, <>In Safari, open this menu again and follow the install steps.</>],
          ]
        : [
            [MoreVertical, <>Tap the <B>⋮</B> menu at the top-right.</>],
            [ExternalLink, <>Choose <B>Open in Chrome</B> (or <B>Open in browser</B>).</>],
            [PlusSquare, <>In Chrome, open this menu again and tap <B>Install now</B>.</>],
          ],
      primary: 'copy',
      copyHint: `Or copy the link and paste it into ${target}.`,
    };
  }

  if (canPrompt) {
    return {
      intro: 'Install it in one tap. It opens from your home screen like any other app.',
      steps: [
        [Download, <>Tap <B>Install now</B> below.</>],
        [Check, <>Confirm with <B>Install</B> in the box that appears.</>],
      ],
      primary: 'prompt',
    };
  }

  if (platform === 'ios') {
    if (iosNeedsSafari) {
      return {
        intro: 'On this iPhone version, apps can be installed only from Safari.',
        steps: [
          [Copy, <>Tap <B>Copy link</B> below.</>],
          [ExternalLink, <>Open <B>Safari</B> and paste the link.</>],
          [Share, <>Tap <B>Share</B>, then <B>Add to Home Screen</B>.</>],
        ],
        primary: 'copy',
      };
    }
    const shareWhere = browser === 'safari'
      ? <>Tap the <B>Share</B> button <Share className="inline h-3.5 w-3.5 -mt-0.5" /> in the toolbar (bottom on iPhone, top on iPad).</>
      : <>Tap the <B>Share</B> button <Share className="inline h-3.5 w-3.5 -mt-0.5" /> in the address bar, or find <B>Share</B> in the <B>•••</B> menu.</>;
    return {
      intro: 'Add it to your Home Screen in three taps.',
      steps: [
        [Share, shareWhere],
        [PlusSquare, <>Scroll down and tap <B>Add to Home Screen</B>, then <B>Add</B>.</>],
        [Smartphone, <>Open the app from the new icon on your Home Screen.</>],
      ],
      primary: null,
    };
  }

  if (platform === 'android') {
    const byBrowser = {
      samsung: [
        [Menu, <>Tap the <B>≡</B> menu at the bottom-right.</>],
        [PlusSquare, <>Tap <B>Add page to</B>, then <B>Home screen</B>.</>],
      ],
      firefox: [
        [MoreVertical, <>Tap the <B>⋮</B> menu.</>],
        [PlusSquare, <>Tap <B>Add app to Home screen</B> (or <B>Install</B>).</>],
      ],
      edge: [
        [MoreHorizontal, <>Tap the <B>•••</B> menu at the bottom.</>],
        [PlusSquare, <>Tap <B>Add to phone</B>, then <B>Install</B>.</>],
      ],
      opera: [
        [MoreVertical, <>Tap the <B>⋮</B> menu.</>],
        [PlusSquare, <>Tap <B>Add to</B>, then <B>Home screen</B>.</>],
      ],
    };
    return {
      intro: 'Add it to your home screen from the browser menu.',
      steps: [
        ...(byBrowser[browser] || [
          [MoreVertical, <>Tap the <B>⋮</B> menu at the top-right.</>],
          [PlusSquare, <>Tap <B>Install app</B> or <B>Add to Home screen</B>, then <B>Install</B>.</>],
        ]),
        [Smartphone, <>Open the app from the new icon on your home screen.</>],
      ],
      primary: null,
    };
  }

  // Desktop
  if (!installSupported || browser === 'other') {
    return {
      intro: 'This browser can\'t install apps. Open this page in Google Chrome or Microsoft Edge to install it.',
      steps: [
        [Copy, <>Tap <B>Copy link</B> below.</>],
        [ExternalLink, <>Open <B>Chrome</B> or <B>Edge</B> and paste the link.</>],
        [Download, <>Click the install icon at the right end of the address bar.</>],
      ],
      primary: 'copy',
    };
  }
  if (browser === 'safari') {
    return {
      intro: 'On a Mac (macOS Sonoma or newer) you can add it to the Dock.',
      steps: [
        [Menu, <>In the menu bar, click <B>File</B>.</>],
        [PlusSquare, <>Click <B>Add to Dock</B>, then <B>Add</B>.</>],
      ],
      primary: 'copy',
      copyHint: 'Older macOS? Copy the link and open it in Chrome or Edge.',
    };
  }
  if (browser === 'edge') {
    return {
      intro: 'Install it as an app on this computer.',
      steps: [
        [Download, <>Click the <B>App available</B> icon at the right of the address bar,</>],
        [MoreHorizontal, <>or open <B>•••</B> → <B>Apps</B> → <B>Install this site as an app</B>.</>],
      ],
      primary: null,
    };
  }
  return {
    intro: 'Install it as an app on this computer.',
    steps: [
      [Download, <>Click the install icon at the right end of the address bar,</>],
      [MoreVertical, <>or open <B>⋮</B> → <B>Cast, save and share</B> → <B>Install page as app</B>.</>],
    ],
    primary: null,
  };
}

/**
 * Install dialog + once-per-login auto popup. Mount once inside the signed-in
 * layout; open it from anywhere with openInstallDialog().
 */
export default function InstallAppDialog() {
  const state = useInstallState();
  const orgBrand = useOrgBrand();
  const { toast } = useToast();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);
  const [installing, setInstalling] = useState(false);
  const autoOpenedRef = useRef(false);

  // Auto popup: once per sign-in, a moment after the app loads.
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    if (NO_AUTO_SHOW_PATHS.includes(location.pathname.toLowerCase())) return undefined;
    if (!shouldAutoShowInstall(state) || state.dialogOpen) return undefined;
    const timer = setTimeout(() => {
      autoOpenedRef.current = true;
      openInstallDialog();
    }, AUTO_SHOW_DELAY_MS);
    return () => clearTimeout(timer);
    // Re-evaluated only when install status changes, not on every navigation.
  }, [isAuthenticated, state.installed, state.installSupported]);

  // Close automatically once the app gets installed.
  useEffect(() => {
    if (state.installed && state.dialogOpen) closeInstallDialog();
  }, [state.installed, state.dialogOpen]);

  if (state.standalone || !isAuthenticated) return null;

  const info = getInstructions(state);
  const appName = orgBrand.name || 'the app';

  const handleClose = () => {
    // Closing the automatic popup counts as "Later" for this sign-in.
    if (autoOpenedRef.current) dismissInstallForThisLogin();
    else closeInstallDialog();
    autoOpenedRef.current = false;
    setCopied(false);
  };

  const handleInstall = async () => {
    setInstalling(true);
    const outcome = await promptInstall();
    setInstalling(false);
    if (outcome === 'accepted') {
      toast({ title: 'App installed', description: `Open ${appName} from your home screen.` });
      autoOpenedRef.current = false;
      closeInstallDialog();
    }
  };

  const handleCopy = async () => {
    const url = window.location.origin;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this link:', url);
    }
    setCopied(true);
  };

  const handleAlreadyInstalled = () => {
    autoOpenedRef.current = false;
    markInstalled();
    toast({ title: 'Got it', description: `Open ${appName} from your home screen next time.` });
  };

  return (
    <Dialog open={state.dialogOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2 shadow-md dark:bg-slate-800">
            <img src={orgBrand.logoUrl || APP_IMAGES.LOGOS.PRIMARY} alt="" className="h-full w-full object-contain" />
          </div>
          <DialogTitle className="text-center">Install {appName}</DialogTitle>
          <DialogDescription className="text-center">
            Opens like an app from your home screen, and you get payment and request notifications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-300">{info.intro}</p>
          <ol className="space-y-2.5">
            {info.steps.map(([Icon, text], index) => (
              <li key={index} className="flex items-start gap-3 rounded-lg bg-slate-50 p-2.5 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span className="min-w-0">{text}</span>
              </li>
            ))}
          </ol>
          {info.copyHint && <p className="text-xs text-slate-500 dark:text-slate-400">{info.copyHint}</p>}
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {info.primary === 'prompt' && (
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleInstall} disabled={installing}>
              <Download className="mr-2 h-4 w-4" />
              Install now
            </Button>
          )}
          {info.primary === 'copy' && (
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleCopy}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? 'Link copied' : 'Copy link'}
            </Button>
          )}
          <Button variant="outline" className="w-full" onClick={handleClose}>
            {info.primary ? 'Later' : 'Done'}
          </Button>
          <button
            type="button"
            onClick={handleAlreadyInstalled}
            className="text-xs text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
          >
            I've already installed it
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
