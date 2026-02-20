import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppRole } from '../auth/auth.types';
import { CreateUserRequest, UpdateUserRequest, User, UserListResponse } from './users.types';

type UserRecord = User & { password: string };

const DEMO_USERS: Array<{
  id: string;
  email: string;
  name: string;
  role: AppRole;
  password: string;
}> = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@insights.local',
    name: 'Admin User',
    role: 'admin',
    password: 'Admin@123',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'manager@insights.local',
    name: 'Engineering Manager',
    role: 'engineering_manager',
    password: 'Manager@123',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'lead@insights.local',
    name: 'Team Lead',
    role: 'team_lead',
    password: 'Lead@123',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'executive@insights.local',
    name: 'Executive User',
    role: 'executive',
    password: 'Executive@123',
  },
];

@Injectable()
export class UsersService {
  private readonly users: UserRecord[] = DEMO_USERS.map((user) => {
    const now = new Date().toISOString();
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      password: user.password,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  });

  list(page: number, pageSize: number): UserListResponse {
    const filtered = [...this.users];
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      items: filtered.slice(start, end).map((user) => this.toUser(user)),
      page,
      pageSize,
      total: filtered.length,
    };
  }

  getById(userId: string): User {
    const user = this.users.find((item) => item.id === userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return this.toUser(user);
  }

  findForAuth(emailRaw: string, passwordRaw: string): User {
    const email = emailRaw.trim().toLowerCase();
    const password = passwordRaw.trim();
    const user = this.users.find(
      (item) => item.email.toLowerCase() === email && item.password === password,
    );

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.toUser(user);
  }

  create(input: CreateUserRequest): User {
    const email = input.email?.trim().toLowerCase();
    const name = input.name?.trim();
    const role = input.role;
    const password = input.password?.trim();

    if (!email || !name || !role || !password) {
      throw new BadRequestException('email, name, role, and password are required.');
    }

    this.assertUniqueEmail(email);

    const now = new Date().toISOString();
    const user: UserRecord = {
      id: randomUUID(),
      email,
      name,
      role,
      password,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.users.push(user);
    return this.toUser(user);
  }

  update(userId: string, input: UpdateUserRequest): User {
    const user = this.users.find((item) => item.id === userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (input.email !== undefined) {
      const nextEmail = input.email.trim().toLowerCase();
      if (!nextEmail) {
        throw new BadRequestException('email cannot be empty.');
      }
      this.assertUniqueEmail(nextEmail, userId);
      user.email = nextEmail;
    }

    if (input.name !== undefined) {
      const nextName = input.name.trim();
      if (!nextName) {
        throw new BadRequestException('name cannot be empty.');
      }
      user.name = nextName;
    }

    if (input.role !== undefined) {
      user.role = input.role;
    }

    if (input.password !== undefined) {
      const nextPassword = input.password.trim();
      if (!nextPassword) {
        throw new BadRequestException('password cannot be empty.');
      }
      user.password = nextPassword;
    }

    if (input.isActive !== undefined) {
      user.isActive = input.isActive;
    }

    user.updatedAt = new Date().toISOString();
    return this.toUser(user);
  }

  softDelete(userId: string): void {
    const user = this.users.find((item) => item.id === userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    user.isActive = false;
    user.updatedAt = new Date().toISOString();
  }

  private assertUniqueEmail(email: string, excludeUserId?: string): void {
    const duplicate = this.users.find(
      (item) => item.email.toLowerCase() === email && item.id !== excludeUserId,
    );
    if (duplicate) {
      throw new BadRequestException('User email already exists.');
    }
  }

  private toUser(user: UserRecord): User {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
