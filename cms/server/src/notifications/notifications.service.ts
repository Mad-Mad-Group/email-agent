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
  }): Promise<NotificationDocument> {
    return this.model.create({
      ...data,
      type: data.type ?? 'system',
      read: false,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    });
  }

  /** 列表（最新優先），可篩 read 狀態 */
  async findAll(query: { read?: boolean; limit?: number; page?: number }) {
    const filter: Record<string, any> = {};
    if (query.read !== undefined) filter.read = query.read;

    const limit = query.limit ?? 50;
    const page = query.page ?? 1;
    const skip = (page - 1) * limit;

    const [items, total, unread_count] = await Promise.all([
      this.model.find(filter).sort({ _id: -1 }).skip(skip).limit(limit).lean().exec(),
      this.model.countDocuments(filter).exec(),
      this.model.countDocuments({ read: false }).exec(),
    ]);

    return { data: items, total, unread_count, page, limit };
  }

  /** 未讀數量 */
  async unreadCount(): Promise<number> {
    return this.model.countDocuments({ read: false }).exec();
  }

  /** 標記單條已讀 */
  async markRead(id: string): Promise<NotificationDocument | null> {
    return this.model.findByIdAndUpdate(id, { read: true }, { new: true }).exec();
  }

  /** 全部標記已讀 */
  async markAllRead(): Promise<number> {
    const result = await this.model.updateMany({ read: false }, { read: true }).exec();
    return result.modifiedCount;
  }
}
