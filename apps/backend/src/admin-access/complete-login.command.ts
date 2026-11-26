import { Command, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { IssuedSession, TelegramLoginCallback } from '@lashes/api-contract';
import { Sessions } from './sessions.js';

export class CompleteLogin extends Command<IssuedSession> {
  constructor(readonly callback: TelegramLoginCallback) {
    super();
  }
}

@CommandHandler(CompleteLogin)
export class CompleteLoginHandler implements ICommandHandler<CompleteLogin> {
  constructor(private readonly sessions: Sessions) {}

  execute({ callback }: CompleteLogin) {
    return this.sessions.complete(callback.code, callback.state, callback.browserKey);
  }
}
