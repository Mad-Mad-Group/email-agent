import { EmailQueueService } from './email-queue.service';
import { ListEmailQueueQueryDto } from './dto/list-email-queue-query.dto';
import { EditEmailDto } from './dto/edit-email.dto';
import { RejectEmailDto } from './dto/reject-email.dto';
export declare class EmailQueueController {
    private readonly svc;
    constructor(svc: EmailQueueService);
    list(q: ListEmailQueueQueryDto): Promise<{
        items: (import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, import("./schemas/email-queue.schema").EmailQueueItem, {}, {}> & import("./schemas/email-queue.schema").EmailQueueItem & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
        total: number;
        page: number;
        limit: number;
    }>;
    get(id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/email-queue.schema").EmailQueueItem, {}, {}> & import("./schemas/email-queue.schema").EmailQueueItem & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    edit(id: string, dto: EditEmailDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/email-queue.schema").EmailQueueItem, {}, {}> & import("./schemas/email-queue.schema").EmailQueueItem & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    approve(id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/email-queue.schema").EmailQueueItem, {}, {}> & import("./schemas/email-queue.schema").EmailQueueItem & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    reject(id: string, dto: RejectEmailDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/email-queue.schema").EmailQueueItem, {}, {}> & import("./schemas/email-queue.schema").EmailQueueItem & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    send(id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/email-queue.schema").EmailQueueItem, {}, {}> & import("./schemas/email-queue.schema").EmailQueueItem & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
}
