import { Model, Types } from 'mongoose';
import { EmailQueueItem, EmailQueueDocument } from './schemas/email-queue.schema';
import { ListEmailQueueQueryDto } from './dto/list-email-queue-query.dto';
import { EditEmailDto } from './dto/edit-email.dto';
import { RejectEmailDto } from './dto/reject-email.dto';
import type { EmailSender } from './email-sender.interface';
import { LeadsService } from '../leads/leads.service';
import { SseService } from '../sse/sse.service';
export declare class EmailQueueService {
    private readonly model;
    private readonly sender;
    private readonly leads?;
    private readonly sse?;
    constructor(model: Model<EmailQueueDocument>, sender: EmailSender, leads?: LeadsService | undefined, sse?: SseService | undefined);
    findAll(q: ListEmailQueueQueryDto, userId?: string): Promise<{
        items: (import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, EmailQueueItem, {}, {}> & EmailQueueItem & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        }> & Required<{
            _id: Types.ObjectId;
        }>)[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: string): Promise<EmailQueueDocument>;
    edit(id: string, dto: EditEmailDto): Promise<EmailQueueDocument>;
    approve(id: string): Promise<import("mongoose").Document<unknown, {}, EmailQueueItem, {}, {}> & EmailQueueItem & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    reject(id: string, dto: RejectEmailDto): Promise<EmailQueueDocument>;
    send(id: string): Promise<EmailQueueDocument>;
    private transition;
    private nowStamp;
    private escapeRegex;
    private assertObjectId;
}
