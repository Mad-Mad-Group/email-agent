import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly model: Model<NotificationDocument>,
  ) {}

  /** 建立通知 */
  async create(data: {
    title: string;
    message?: string;
    type?: 'lead' | 'email' | 'campaign' | 'task' | 'system';
    ref_id?: string;
    user_id?: string;
  }): Promise<NotificationDocument> {
    return this.model.create({
      ...data,
      type: data.type ?? 'system',
      read: false,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    });
  }

  /** 用戶過濾條件（自己嘅 + 冇 user_id 嘅舊通知） */
  private userFilter(userId?: string): Record<string, any> {
    const f: Record<string, any> = { hidden: { $ne: true } };
    if (userId) f.$or = [{ user_id: userId }, { user_id: { $exists: false } }];
    return f;
  }

  /** 列表（最新優先），可篩 read 狀態，按 user_id 隔離 */
  async findAll(query: { read?: boolean; limit?: number; page?: number; userId?: string }) {
    const filter = this.userFilter(query.userId);
    if (query.read !== undefined) filter.read = query.read;

    const limit = query.limit ?? 50;
    const page = query.page ?? 1;
    const skip = (page - 1) * limit;

    const [items, total, unread_count] = await Promise.all([
      this.model.find(filter).sort({ _id: -1 }).skip(skip).limit(limit).lean().exec(),
      this.model.countDocuments(filter).exec(),
      this.model.countDocuments({ ...filter, read: false }).exec(),
    ]);

    return { data: items, total, unread_count, page, limit };
  }

  /** 未讀數量（按 user_id 隔離） */
  async unreadCount(userId?: string): Promise<number> {
    const filter = this.userFilter(userId);
    filter.read = false;
    return this.model.countDocuments(filter).exec();
  }

  /** 標記單條已讀（驗證 user_id） */
  async markRead(id: string, userId?: string): Promise<NotificationDocument | null> {
    const filter: Record<string, any> = { _id: id };
    if (userId) filter.$or = [{ user_id: userId }, { user_id: { $exists: false } }];
    return this.model.findOneAndUpdate(filter, { read: true }, { new: true }).exec();
  }

  /** 全部標記已讀（按 user_id 隔離） */
  async markAllRead(userId?: string): Promise<number> {
    const filter = this.userFilter(userId);
    filter.read = false;
    const result = await this.model.updateMany(filter, { read: true }).exec();
    return result.modifiedCount;
  }

  /** 隱藏單條通知（前端顯示為「刪除」） */
  async dismiss(id: string, userId?: string): Promise<NotificationDocument | null> {
    const filter: Record<string, any> = { _id: id };
    if (userId) filter.$or = [{ user_id: userId }, { user_id: { $exists: false } }];
    return this.model.findOneAndUpdate(filter, { hidden: true }, { new: true }).exec();
  }

  /** 隱藏全部通知 */
  async dismissAll(userId?: string): Promise<number> {
    const filter = this.userFilter(userId);
    const result = await this.model.updateMany(filter, { hidden: true }).exec();
    return result.modifiedCount;
  }
}
