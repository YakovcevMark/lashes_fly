import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CompleteLogin } from './complete-login.command.js';
import { bearer, MasterGuard, type MasterRequest } from './session.guard.js';
import { Sessions } from './sessions.js';

@Controller('session')
export class SessionController {
  constructor(
    private readonly sessions: Sessions,
    private readonly commands: CommandBus
  ) {}

  @Post('telegram/start')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  start() {
    return this.sessions.begin();
  }

  @Post('telegram/complete')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  complete(@Body() body: Record<string, unknown> | undefined) {
    const { code, state, browserKey } = body ?? {};
    if (
      typeof code !== 'string' ||
      !code ||
      code.length > 2048 ||
      typeof state !== 'string' ||
      !/^[A-Za-z0-9_-]{43}$/.test(state) ||
      typeof browserKey !== 'string' ||
      !/^[A-Za-z0-9_-]{43}$/.test(browserKey)
    ) {
      throw new BadRequestException('Invalid Telegram callback');
    }
    return this.commands.execute(new CompleteLogin({ code, state, browserKey }));
  }

  @Get()
  @UseGuards(MasterGuard)
  @Header('Cache-Control', 'no-store')
  current(@Req() request: MasterRequest) {
    return request.masterSession;
  }

  @Delete()
  @HttpCode(204)
  logout(@Headers('authorization') header?: string) {
    return this.sessions.revoke(bearer(header));
  }
}
