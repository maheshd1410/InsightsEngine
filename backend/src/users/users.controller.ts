import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { CreateUserRequest, UpdateUserRequest, User, UserListResponse } from './users.types';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('admin')
  @Get()
  listUsers(
    @Query('page') pageRaw = '1',
    @Query('pageSize') pageSizeRaw = '25',
  ): UserListResponse {
    const page = this.parsePositiveInt(pageRaw, 'page');
    const pageSize = this.parsePositiveInt(pageSizeRaw, 'pageSize');
    return this.usersService.list(page, pageSize);
  }

  @Roles('admin')
  @Get(':userId')
  getUserById(@Param('userId', ParseUUIDPipe) userId: string): User {
    return this.usersService.getById(userId);
  }

  @Roles('admin')
  @Post()
  createUser(@Body() input: CreateUserRequest): User {
    return this.usersService.create(input);
  }

  @Roles('admin')
  @Patch(':userId')
  updateUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() input: UpdateUserRequest,
  ): User {
    return this.usersService.update(userId, input);
  }

  @Roles('admin')
  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(@Param('userId', ParseUUIDPipe) userId: string): void {
    this.usersService.softDelete(userId);
  }

  private parsePositiveInt(rawValue: string, fieldName: string): number {
    const value = Number.parseInt(rawValue, 10);
    if (Number.isNaN(value) || value <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer.`);
    }
    return value;
  }
}
