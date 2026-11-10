import { charityClient } from '@/api/charityClient';
import { isIOSDevice, isStandalone } from '@/lib/device';

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** iOS major.minor from the user agent, or null (iPadOS often hides it). */
export function iosVersion() {
  if (typeof navigator === 'undefined') return null;
  const match = /OS (\d+)[_.](\d+)/.exec(navigator.userAgent);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

export function isIOSBelow164() {
  const version = iosVersion();
  if (!version) return false;
  return version.major < 16 || (version.major === 16 && version.minor < 4);
}

export function pushApisAvailable() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Describes where we are running so the UI can pick the right guidance.
 * state: 'ios-install' (iOS Safari tab), 'ios-unsupported' (< 16.4), 'unsupported',
 *        'ready' (can ask from a button tap).
 */
export function getPushEnvironment() {
  const ios = isIOSDevice();
  const standalone = typeof window !== 'undefined' && isStandalone();
  const permission = typeof window !== 'undefined' && 'Notification' in window
    ? window.Notification.permission
    : 'unsupported';

  let state = 'ready';
  if (ios && isIOSBelow164()) state = 'ios-unsupported';
  else if (ios && !standalone) state = 'ios-install';
  else if (!pushApisAvailable()) state = 'unsupported';

  const platform = ios ? 'ios' : /Android/i.test(navigator.userAgent) ? 'android' : 'desktop';
  return { platform, standalone, permission, state };
}

function sameKey(subscription, expected) {
  const current = subscription?.options?.applicationServerKey;
  if (!current) return false;
  const bytes = new Uint8Array(current);
  if (bytes.length !== expected.length) return false;
  return bytes.every((value, index) => value === expected[index]);
}

/**
 * Makes sure the browser subscription matches the server's current VAPID key.
 * Never prompts: it only runs when permission is already granted. After a key
 * rotation the old subscription is dropped and a new one is registered silently.
 */
export async function syncPushSubscription() {
  if (!pushApisAvailable() || window.Notification.permission !== 'granted') {
    return { status: 'skipped' };
  }
  const config = await charityClient.notifications.getPushPublicKey();
  const publicKey = String(config?.public_key || '').trim();
  if (!config?.enabled || !publicKey) return { status: 'disabled' };

  const expected = urlBase64ToUint8Array(publicKey);
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  let resubscribed = false;

  if (subscription && !sameKey(subscription, expected)) {
    const oldEndpoint = subscription.endpoint;
    await subscription.unsubscribe();
    try {
      await charityClient.notifications.pushUnsubscribe(oldEndpoint);
    } catch {
      // The server also deactivates stale subscriptions on the next send.
    }
    subscription = null;
    resubscribed = true;
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: expected,
    });
  }

  await charityClient.notifications.pushSubscribe(subscription.toJSON());
  return { status: 'subscribed', resubscribed };
}

/**
 * Asks for permission and subscribes. Call ONLY from a user tap (button click).
 * Never call this on page load, and never from an iOS Safari tab.
 */
export async function enableNotificationsFromTap() {
  const env = getPushEnvironment();
  if (env.state !== 'ready') return { status: env.state };
  let permission = window.Notification.permission;
  if (permission === 'default') {
    permission = await window.Notification.requestPermission();
  }
  if (permission !== 'granted') return { status: permission };
  const result = await syncPushSubscription();
  return { ...result, permission };
}
