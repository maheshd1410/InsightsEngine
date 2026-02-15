import { Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateOrganizationRequest, Organization } from './organizations.types';

@Injectable()
export class OrganizationsService {
  private readonly organizations: Organization[] = [];

  list(): Organization[] {
    return this.organizations;
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
}
