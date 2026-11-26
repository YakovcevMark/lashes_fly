import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  IssuedSession,
  MasterSession,
  TelegramLoginCallback,
  TelegramLoginStart,
} from '@lashes/api-contract';

// Pages serves static assets; a relative API target is only supplied by the local dev proxy.
const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || (import.meta.env.DEV ? '/api/v1' : '');
export const hasApi = Boolean(baseURL);

class SessionApi {
  constructor(private readonly http: AxiosInstance) {}

  async begin() {
    return (await this.http.post<TelegramLoginStart>('session/telegram/start')).data;
  }

  async complete(input: TelegramLoginCallback) {
    return (await this.http.post<IssuedSession>('session/telegram/complete', input)).data;
  }

  async current(token: string) {
    return (
      await this.http.get<MasterSession>('session', {
        headers: { Authorization: 'Bearer ' + token },
      })
    ).data;
  }

  async logout(token: string) {
    await this.http.delete('session', { headers: { Authorization: 'Bearer ' + token } });
  }
}

export const API = { session: new SessionApi(axios.create({ baseURL, timeout: 15000 })) };

/** Extracts the HTTP response status without treating a network error as an expired session. */
export function responseStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
