import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { MasterSession } from '@lashes/api-contract';
import { Sessions } from './sessions.js';

export interface MasterRequest extends Request {
  masterSession: MasterSession;
}

/** Parses the opaque server-issued credential from the Authorization header. */
export function bearer(header?: string): string {
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(header ?? '')?.[1];
  if (!token) throw new UnauthorizedException();
  return token;
}

@Injectable()
export class MasterGuard implements CanActivate {
  constructor(private readonly sessions: Sessions) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<MasterRequest>();
    request.masterSession = await this.sessions.current(bearer(request.headers.authorization));
    return true;
  }
}
