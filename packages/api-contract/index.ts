export interface TelegramLoginStart {
  authorizationUrl: string;
  browserKey: string;
}

export interface TelegramLoginCallback {
  code: string;
  state: string;
  browserKey: string;
}

export interface MasterSession {
  telegramId: string;
  expiresAt: string;
}

export interface IssuedSession {
  accessToken: string;
  session: MasterSession;
}
