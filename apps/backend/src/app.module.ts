import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CompleteLoginHandler } from './admin-access/complete-login.command.js';
import { MasterGuard } from './admin-access/session.guard.js';
import { SessionController } from './admin-access/session.controller.js';
import { Sessions } from './admin-access/sessions.js';
import { Database } from './db/database.js';
import { TelegramIdentity } from './telegram/identity.js';

@Module({
  imports: [CqrsModule.forRoot()],
  controllers: [SessionController],
  providers: [Database, TelegramIdentity, Sessions, MasterGuard, CompleteLoginHandler],
})
export class AppModule {}
