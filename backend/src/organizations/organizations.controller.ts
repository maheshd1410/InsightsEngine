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
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationRequest,
  Organization,
  OrganizationListResponse,
  UpdateOrganizationRequest,
} from './organizations.types';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Roles('admin', 'engineering_manager')
  @Get()
  listOrganizations(
    @Query('page') pageRaw = '1',
    @Query('pageSize') pageSizeRaw = '25',
  ): OrganizationListResponse {
    const page = this.parsePositiveInt(pageRaw, 'page');
    const pageSize = this.parsePositiveInt(pageSizeRaw, 'pageSize');

    return this.organizationsService.list(page, pageSize);
  }

  @Roles('admin', 'engineering_manager')
  @Get(':organizationId')
  getOrganizationById(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Organization {
    return this.organizationsService.getById(organizationId);
  }

  @Roles('admin')
  @Post()
  createOrganization(@Body() input: CreateOrganizationRequest): Organization {
    return this.organizationsService.create(input);
  }

  @Roles('admin')
  @Patch(':organizationId')
  updateOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() input: UpdateOrganizationRequest,
  ): Organization {
    return this.organizationsService.update(organizationId, input);
  }

  @Roles('admin')
  @Delete(':organizationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteOrganization(@Param('organizationId', ParseUUIDPipe) organizationId: string): void {
    this.organizationsService.softDelete(organizationId);
  }

  private parsePositiveInt(rawValue: string, fieldName: string): number {
    const value = Number.parseInt(rawValue, 10);
    if (Number.isNaN(value) || value <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer.`);
    }

    return value;
  }
}
