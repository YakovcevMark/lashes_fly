import { useEffect, useSyncExternalStore } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { API, hasApi, responseStatus } from '../../session-api';
import { readToken, rememberAttempt, saveToken, subscribeToken } from '../../session-storage';

/** Starts Telegram's full-page login while preserving the requested private route. */
export function useTelegramLogin(returnPath: string) {
  return useMutation({
    mutationFn: async () => {
      const { authorizationUrl, browserKey } = await API.session.begin();
      const url = new URL(authorizationUrl);
      const state = url.searchParams.get('state');
      if (url.origin !== 'https://oauth.telegram.org' || !state)
        throw new Error('Invalid authorization URL');
      rememberAttempt({ browserKey, state, returnPath });
      window.location.assign(url.href);
    },
  });
}

/** Rechecks the session on navigation/focus and clears the credential at server expiry. */
export function useMasterSession() {
  const token = useSyncExternalStore(subscribeToken, readToken);
  const query = useQuery({
    queryKey: ['session', token],
    enabled: hasApi && Boolean(token),
    queryFn: () => API.session.current(token!),
    retry: false,
    gcTime: 0,
  });
  useEffect(() => {
    if (!token) return;
    const clearCurrent = () => {
      if (readToken() === token) saveToken(null);
    };
    if (responseStatus(query.error) === 401) {
      clearCurrent();
      return;
    }
    if (!query.data) return;
    const expiry = Date.parse(query.data.expiresAt);
    // Browser timers accept at most a signed 32-bit delay.
    let timer: number;
    const check = () => {
      const remaining = expiry - Date.now();
      if (remaining <= 0) clearCurrent();
      else timer = window.setTimeout(check, Math.min(remaining, 2_147_483_647));
    };
    check();
    return () => window.clearTimeout(timer);
  }, [query.data, query.error, token]);
  return { token, query };
}

/** Revokes the current credential on the server before removing it from this browser. */
export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const token = readToken();
      if (!token) return;
      await API.session.logout(token);
      if (readToken() === token) saveToken(null);
    },
  });
}
