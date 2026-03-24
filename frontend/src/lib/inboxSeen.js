const SEEN_MAX = 400;
const PREFIX = 'crm.inbox';

export function getDealerPhoneKey(search) {
  try {
    const params = new URLSearchParams(search || '');
    const phone = (params.get('dealer_phone') || '').trim();
    return phone ? (phone.replace(/\D/g, '') || phone) : '';
  } catch {
    return '';
  }
}

export function getSeenCallIds(dealerPhoneKey) {
  if (!dealerPhoneKey || typeof window === 'undefined') return new Set();
  const key = `${PREFIX}SeenCallIds.${dealerPhoneKey}`;
  try {
    const raw = window.localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function markCallAsSeen(dealerPhoneKey, callId) {
  if (!dealerPhoneKey || !callId) return;
  const key = `${PREFIX}SeenCallIds.${dealerPhoneKey}`;
  const seen = getSeenCallIds(dealerPhoneKey);
  seen.add(callId);
  const arr = Array.from(seen);
  const toStore = arr.length > SEEN_MAX ? arr.slice(-SEEN_MAX) : arr;
  window.localStorage.setItem(key, JSON.stringify(toStore));
}

export function unmarkCallAsSeen(dealerPhoneKey, callId) {
  if (!dealerPhoneKey || !callId) return;
  const key = `${PREFIX}SeenCallIds.${dealerPhoneKey}`;
  const seen = getSeenCallIds(dealerPhoneKey);
  seen.delete(callId);
  window.localStorage.setItem(key, JSON.stringify(Array.from(seen)));
}

export function markAllCallsAsSeen(dealerPhoneKey, callIds) {
  if (!dealerPhoneKey) return;
  const key = `${PREFIX}SeenCallIds.${dealerPhoneKey}`;
  const seen = getSeenCallIds(dealerPhoneKey);
  callIds.forEach((id) => seen.add(id));
  const arr = Array.from(seen);
  const toStore = arr.length > SEEN_MAX ? arr.slice(-SEEN_MAX) : arr;
  window.localStorage.setItem(key, JSON.stringify(toStore));
}

export function setInboxUnreadCount(dealerPhoneKey, count) {
  if (!dealerPhoneKey || typeof window === 'undefined') return;
  const key = `${PREFIX}Unread.${dealerPhoneKey}`;
  window.localStorage.setItem(key, String(Math.max(0, count)));
  window.dispatchEvent(new Event('crm-inbox-unread-changed'));
}

export function getInboxUnreadCount(dealerPhoneKey) {
  if (!dealerPhoneKey || typeof window === 'undefined') return 0;
  const key = `${PREFIX}Unread.${dealerPhoneKey}`;
  const raw = window.localStorage.getItem(key);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
