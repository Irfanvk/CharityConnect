const SETUP_PREFIX = 'member_setup:';

function setupKey(userId) {
  return `${SETUP_PREFIX}${userId || 'anonymous'}`;
}

export function getMemberSetup(userId) {
  if (!userId || typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(setupKey(userId));
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveMemberSetup(userId, setupData) {
  if (!userId || typeof window === 'undefined') return;

  const payload = {
    completed: true,
    completedAt: new Date().toISOString(),
    ...setupData,
  };

  window.localStorage.setItem(setupKey(userId), JSON.stringify(payload));
}

export function isMemberSetupCompleted(userId) {
  return Boolean(getMemberSetup(userId)?.completed);
}

export function clearMemberSetup(userId) {
  if (!userId || typeof window === 'undefined') return;
  window.localStorage.removeItem(setupKey(userId));
}
