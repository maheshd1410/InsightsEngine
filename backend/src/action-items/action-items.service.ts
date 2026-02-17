import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ActionItem,
  ActionItemListResponse,
  ActionItemStatus,
  CreateActionItemRequest,
} from './action-items.types';

const ACTION_ITEM_STATUSES: ActionItemStatus[] = [
  'open',
  'in_progress',
  'blocked',
  'done',
];

@Injectable()
export class ActionItemsService {
  private readonly actionItems: ActionItem[] = [];

  list(page: number, pageSize: number, status?: ActionItemStatus): ActionItemListResponse {
    const filtered = status
      ? this.actionItems.filter((item) => item.status === status)
      : this.actionItems;

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      items: filtered.slice(start, end),
      page,
      pageSize,
      total: filtered.length,
    };
  }

  create(input: CreateActionItemRequest): ActionItem {
    const title = input.title?.trim();
    const ownerUserId = input.ownerUserId?.trim();

    if (!title || !ownerUserId || !input.dueDate || !input.status) {
      throw new BadRequestException(
        'title, ownerUserId, dueDate, and status are required.',
      );
    }
    if (!this.isUuid(ownerUserId)) {
      throw new BadRequestException('ownerUserId must be a valid UUID.');
    }
    if (!this.isDateString(input.dueDate)) {
      throw new BadRequestException('dueDate must be in YYYY-MM-DD format.');
    }
    if (!ACTION_ITEM_STATUSES.includes(input.status)) {
      throw new BadRequestException('status is invalid.');
    }

    const now = new Date().toISOString();
    const actionItem: ActionItem = {
      id: randomUUID(),
      title,
      description: input.description?.trim() || undefined,
      ownerUserId,
      dueDate: input.dueDate,
      status: input.status,
      createdAt: now,
      updatedAt: now,
    };

    this.actionItems.push(actionItem);
    return actionItem;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private isDateString(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }
}
