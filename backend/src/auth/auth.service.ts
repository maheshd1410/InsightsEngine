import { Injectable, UnauthorizedException } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
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

type DemoUser = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: AppRole;
};

const DEMO_USERS: DemoUser[] = [
  {
    id: 'u-admin',
    email: 'admin@insights.local',
    password: 'Admin@123',
    name: 'Admin User',
    role: 'admin',
  },
  {
    id: 'u-manager',
    email: 'manager@insights.local',
    password: 'Manager@123',
    name: 'Engineering Manager',
    role: 'engineering_manager',
  },
  {
    id: 'u-lead',
    email: 'lead@insights.local',
    password: 'Lead@123',
    name: 'Team Lead',
    role: 'team_lead',
  },
  {
    id: 'u-exec',
    email: 'executive@insights.local',
    password: 'Executive@123',
    name: 'Executive User',
    role: 'executive',
  },
];

@Injectable()
export class AuthService {
  login(emailRaw: string, passwordRaw: string): LoginResponse {
    const email = emailRaw.trim().toLowerCase();
    const password = passwordRaw.trim();

    const user = DEMO_USERS.find(
      (candidate) => candidate.email.toLowerCase() === email && candidate.password === password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

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
