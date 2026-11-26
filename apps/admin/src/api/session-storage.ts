const prefix = 'lashes-fly:' + import.meta.env.BASE_URL;
const tokenKey = prefix + ':session';
const loginKey = prefix + ':login';
const changed = 'lashes-fly-session-change';

export interface LoginAttempt {
  state: string;
  browserKey: string;
  returnPath: string;
}

/** Returns only the credential issued for this panel deployment. */
export function readToken(): string | null {
  return localStorage.getItem(tokenKey);
}

/** Notifies the current tab as well as relying on the browser event in other tabs. */
export function saveToken(token: string | null): void {
  if (token) localStorage.setItem(tokenKey, token);
  else localStorage.removeItem(tokenKey);
  window.dispatchEvent(new Event(changed));
}

/** Subscribes the React route guard to local changes and logout in another tab. */
export function subscribeToken(callback: () => void) {
  window.addEventListener(changed, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(changed, callback);
    window.removeEventListener('storage', callback);
  };
}

/** Keeps the login binding in the initiating tab across the Telegram redirect. */
export function rememberAttempt(attempt: LoginAttempt): void {
  sessionStorage.setItem(loginKey, JSON.stringify(attempt));
}

/** Consumes the pending login only when Telegram returns the matching state. */
export function takeAttempt(state: string | null): LoginAttempt | null {
  const raw = sessionStorage.getItem(loginKey);
  if (!raw || !state) return null;
  try {
    const attempt = JSON.parse(raw) as Partial<LoginAttempt>;
    if (attempt.state !== state || typeof attempt.browserKey !== 'string') return null;
    sessionStorage.removeItem(loginKey);
    return {
      state,
      browserKey: attempt.browserKey,
      returnPath: attempt.returnPath === '/panel' ? '/panel' : '/',
    };
  } catch {
    return null;
  }
}
