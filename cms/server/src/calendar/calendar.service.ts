import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import {
  CalendarEvent,
  CalendarEventDocument,
} from './schemas/calendar-event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class CalendarService {
  constructor(
    @InjectModel(CalendarEvent.name)
    private readonly eventModel: Model<CalendarEventDocument>,
  ) {}

  /**
   * 列表：可按 month/year 篩選，否則回傳全部。
   * 回傳格式配合 ResponseInterceptor pagination。
   */
  async findAll(userId?: string, month?: number, year?: number) {
    const filter: Record<string, any> = {};

    if (userId) filter.userId = userId;

    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      filter.start = { $gte: start, $lt: end };
    }

    const items = await this.eventModel
      .find(filter)
      .sort({ start: 1 })
      .lean()
      .exec();

    return { items, total: items.length, page: 1, limit: 999 };
  }

  async findOne(id: string, userId?: string): Promise<CalendarEventDocument> {
    const filter: Record<string, any> = { _id: id };
    if (userId) filter.userId = userId;
    const event = await this.eventModel.findOne(filter).exec();
    if (!event) throw new NotFoundException('Calendar event not found');
    return event;
  }

  async create(dto: CreateEventDto, userId?: string): Promise<CalendarEventDocument> {
    return this.eventModel.create({
      ...dto,
      userId,
      event_id: randomBytes(8).toString('hex'),
      start: new Date(dto.start),
      end: dto.end ? new Date(dto.end) : undefined,
      all_day: dto.all_day ?? false,
      type: dto.type ?? 'other',
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    });
  }

  async update(
    id: string,
    dto: UpdateEventDto,
    userId?: string,
  ): Promise<CalendarEventDocument> {
    const event = await this.findOne(id, userId);
    const clean: Record<string, any> = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    );
    // 日期字串轉 Date
    if (clean.start) clean.start = new Date(clean.start);
    if (clean.end) clean.end = new Date(clean.end);
    clean.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);

    Object.assign(event, clean);
    await event.save();
    return event;
  }

  async remove(id: string, userId?: string): Promise<void> {
    const event = await this.findOne(id, userId);
    await event.deleteOne();
  }
}
