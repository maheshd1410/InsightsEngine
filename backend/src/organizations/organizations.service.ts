import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CreateOrganizationRequest,
  Organization,
  OrganizationListResponse,
  UpdateOrganizationRequest,
} from './organizations.types';

@Injectable()
export class OrganizationsService {
  private readonly organizations: Organization[] = [];

  list(page: number, pageSize: number): OrganizationListResponse {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      items: this.organizations.slice(start, end),
      page,
      pageSize,
      total: this.organizations.length,
    };
  }

  getById(organizationId: string): Organization {
    const organization = this.organizations.find((org) => org.id === organizationId);
    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }

    return organization;
  }

  create(input: CreateOrganizationRequest): Organization {
    const name = input.name?.trim();
    const code = input.code?.trim().toUpperCase();

    if (!name || !code) {
      throw new BadRequestException('Both name and code are required.');
    }

    const duplicate = this.organizations.find((org) => org.code === code);
    if (duplicate) {
      throw new BadRequestException('Organization code already exists.');
    }

    const now = new Date().toISOString();
    const organization: Organization = {
      id: randomUUID(),
      name,
      code,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.organizations.push(organization);
    return organization;
  }

  update(organizationId: string, input: UpdateOrganizationRequest): Organization {
    const organization = this.getById(organizationId);

    const nextName = input.name !== undefined ? input.name.trim() : organization.name;
    const nextCode =
      input.code !== undefined ? input.code.trim().toUpperCase() : organization.code;

    if (!nextName || !nextCode) {
      throw new BadRequestException('name and code cannot be empty.');
    }

    const duplicate = this.organizations.find(
      (org) => org.id !== organizationId && org.code === nextCode,
    );
    if (duplicate) {
      throw new BadRequestException('Organization code already exists.');
    }

    organization.name = nextName;
    organization.code = nextCode;
    if (input.isActive !== undefined) {
      organization.isActive = input.isActive;
    }
    organization.updatedAt = new Date().toISOString();

    return organization;
  }

  softDelete(organizationId: string): void {
    const organization = this.getById(organizationId);
    organization.isActive = false;
    organization.updatedAt = new Date().toISOString();
  }
}
