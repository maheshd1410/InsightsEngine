import { Injectable } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { UsersService } from '../users/users.service';
import { AppRole } from './auth.types';

export interface LoginResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: AppRole;
  };
}

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  login(emailRaw: string, passwordRaw: string): LoginResponse {
    const user = this.usersService.findForAuth(emailRaw, passwordRaw);

    const secret = process.env.JWT_SECRET ?? 'dev-secret';
    const expiresInSeconds = 8 * 60 * 60;
    const accessToken = sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      secret,
      { expiresIn: `${expiresInSeconds}s` },
    );

    return {
      accessToken,
      expiresInSeconds,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
