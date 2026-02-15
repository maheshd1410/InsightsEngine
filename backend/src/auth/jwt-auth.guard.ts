import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verify } from 'jsonwebtoken';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import { JwtClaims } from './auth.types';

type AuthenticatedRequest = Request & { user?: JwtClaims };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.header('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header.');
    }

    const token = authHeader.substring('Bearer '.length);
    const secret = process.env.JWT_SECRET ?? 'dev-secret';

    try {
      const payload = verify(token, secret) as JwtClaims;
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}
