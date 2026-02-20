import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { Public } from './public.decorator';
import { AuthService, LoginResponse } from './auth.service';

type LoginRequest = {
  email?: string;
  password?: string;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: LoginRequest): LoginResponse {
    const email = body.email?.trim();
    const password = body.password?.trim();

    if (!email || !password) {
      throw new BadRequestException('email and password are required.');
    }

    return this.authService.login(email, password);
  }
}
