import { copy } from '@assets/constants';
import { API, responseStatus } from './session-api';
import { saveToken, takeAttempt } from './session-storage';

export type CallbackResult = { path: string; error?: string };

/** Finishes a callback once, removing the authorization code from the browser's address immediately. */
export function consumeLoginCallback(): Promise<CallbackResult> | undefined {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('code') && !url.searchParams.has('error')) return;
  const code = url.searchParams.get('code');
  const denied = url.searchParams.get('error') === 'access_denied';
  const attempt = takeAttempt(url.searchParams.get('state'));
  window.history.replaceState(null, '', url.pathname + url.hash);
  if (!attempt || !code)
    return Promise.resolve({ path: '/login', error: denied ? copy.cancelled : copy.invalid });
  return API.session
    .complete({ code, state: attempt.state, browserKey: attempt.browserKey })
    .then((result) => {
      saveToken(result.accessToken);
      return { path: attempt.returnPath };
    })
    .catch((error: unknown) => {
      const status = responseStatus(error);
      return {
        path: '/login',
        error: status === 403 ? copy.denied : status === 401 ? copy.invalid : copy.unavailable,
      };
    });
}
