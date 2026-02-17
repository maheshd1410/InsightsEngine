import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import {
  ActionItem,
  ActionItemListResponse,
  ActionItemStatus,
  CreateActionItemRequest,
} from './action-items.types';
import { ActionItemsService } from './action-items.service';

const ACTION_ITEM_STATUSES: ActionItemStatus[] = [
  'open',
  'in_progress',
  'blocked',
  'done',
];

@Controller('action-items')
export class ActionItemsController {
  constructor(private readonly actionItemsService: ActionItemsService) {}

  @Roles('admin', 'engineering_manager', 'team_lead')
  @Get()
  listActionItems(
    @Query('status') status?: ActionItemStatus,
    @Query('page') pageRaw = '1',
    @Query('pageSize') pageSizeRaw = '25',
  ): ActionItemListResponse {
    const page = this.parsePositiveInt(pageRaw, 'page');
    const pageSize = this.parsePositiveInt(pageSizeRaw, 'pageSize');

    if (status && !ACTION_ITEM_STATUSES.includes(status)) {
      throw new BadRequestException('status must be one of open, in_progress, blocked, done.');
    }

    return this.actionItemsService.list(page, pageSize, status);
  }

  @Roles('admin', 'engineering_manager', 'team_lead')
  @Post()
  createActionItem(@Body() input: CreateActionItemRequest): ActionItem {
    return this.actionItemsService.create(input);
  }

  private parsePositiveInt(rawValue: string, fieldName: string): number {
    const value = Number.parseInt(rawValue, 10);
    if (Number.isNaN(value) || value <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer.`);
    }
    return value;
  }
}
