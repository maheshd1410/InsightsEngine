export type ActionItemStatus = 'open' | 'in_progress' | 'blocked' | 'done';

export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  ownerUserId: string;
  dueDate: string;
  status: ActionItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActionItemRequest {
  title: string;
  description?: string;
  ownerUserId: string;
  dueDate: string;
  status: ActionItemStatus;
}

export interface ActionItemListResponse {
  items: ActionItem[];
  page: number;
  pageSize: number;
  total: number;
}
