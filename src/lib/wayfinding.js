// @ts-nocheck

import { safeLocalStorage } from '@/lib/device';

const MAX_WAYFINDING_USES = 5;
const VISIT_PREFIX = 'wayfinding:visits:';
const SESSION_PREFIX = 'wayfinding:session:';
const DISMISS_PREFIX = 'wayfinding:dismissed:';
const PREFERENCE_PREFIX = 'wayfinding:preference:';
export const WAYFINDING_STATE_EVENT = 'wayfinding-state-changed';

function getStorageKey(prefix, userKey) {
    return `${prefix}${String(userKey)}`;
}

function readSessionFlag(key) {
    try {
        return sessionStorage.getItem(key) === '1';
    } catch {
        return false;
    }
}

function writeSessionFlag(key) {
    try {
        sessionStorage.setItem(key, '1');
    } catch {
        // Ignore private browsing/session storage failures.
    }
}

function emitWayfindingState(userKey) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(WAYFINDING_STATE_EVENT, { detail: { userKey } }));
}

export function getWayfindingPreference(userKey) {
    if (!userKey) return 'auto';
    const preferenceKey = getStorageKey(PREFERENCE_PREFIX, userKey);
    const value = safeLocalStorage(preferenceKey, undefined);
    if (value === 'on' || value === 'off') {
        return value;
    }
    return 'auto';
}

export function setWayfindingPreference(userKey, preference) {
    if (!userKey) return;
    const preferenceKey = getStorageKey(PREFERENCE_PREFIX, userKey);

    if (preference === 'on' || preference === 'off') {
        safeLocalStorage(preferenceKey, preference);
    } else {
        safeLocalStorage(preferenceKey, null);
    }

    emitWayfindingState(userKey);
}

export function shouldShowWayfinding(userKey) {
    if (!userKey) return false;
    const preference = getWayfindingPreference(userKey);
    if (preference === 'on') return true;
    if (preference === 'off') return false;

    const dismissedKey = getStorageKey(DISMISS_PREFIX, userKey);
    if (safeLocalStorage(dismissedKey, undefined) === '1') {
        return false;
    }

    const visitKey = getStorageKey(VISIT_PREFIX, userKey);
    const visitCount = Number(safeLocalStorage(visitKey, undefined) || '0');
    return visitCount > 0 && visitCount <= MAX_WAYFINDING_USES;
}

export function dismissWayfinding(userKey) {
    if (!userKey) return;
    const dismissedKey = getStorageKey(DISMISS_PREFIX, userKey);
    safeLocalStorage(dismissedKey, '1');
    setWayfindingPreference(userKey, 'off');
}

export function recordWayfindingVisit(userKey) {
    if (!userKey) return false;

    const preference = getWayfindingPreference(userKey);
    if (preference === 'on') return true;
    if (preference === 'off') return false;

    const dismissedKey = getStorageKey(DISMISS_PREFIX, userKey);
    if (safeLocalStorage(dismissedKey, undefined) === '1') {
        return false;
    }

    const visitKey = getStorageKey(VISIT_PREFIX, userKey);
    const sessionKey = getStorageKey(SESSION_PREFIX, userKey);
    let visitCount = Number(safeLocalStorage(visitKey, undefined) || '0');

    if (!readSessionFlag(sessionKey) && visitCount < MAX_WAYFINDING_USES) {
        visitCount += 1;
        safeLocalStorage(visitKey, String(visitCount));
        writeSessionFlag(sessionKey);
        emitWayfindingState(userKey);
    }

    return shouldShowWayfinding(userKey);
}
