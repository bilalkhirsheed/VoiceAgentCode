const DEALER_SESSION_KEY = 'crm.dealer_session';

export function getDealerSession() {
  try {
    const raw = window.localStorage.getItem(DEALER_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.dealer_phone) return data;
    return null;
  } catch {
    return null;
  }
}

export function setDealerSession(session) {
  if (session) {
    window.localStorage.setItem(DEALER_SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(DEALER_SESSION_KEY);
  }
}
