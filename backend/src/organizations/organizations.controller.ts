import { Body, Controller, Get, Post } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationRequest, Organization } from './organizations.types';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Roles('admin', 'engineering_manager')
  @Get()
  listOrganizations(): Organization[] {
    return this.organizationsService.list();
  }

  @Roles('admin')
  @Post()
  createOrganization(@Body() input: CreateOrganizationRequest): Organization {
    return this.organizationsService.create(input);
  }
}
