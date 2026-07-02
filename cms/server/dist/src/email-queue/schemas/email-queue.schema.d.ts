import { HydratedDocument } from 'mongoose';
export type EmailQueueDocument = HydratedDocument<EmailQueueItem>;
export declare class EmailQueueItem {
    email_id?: string;
    lead_id?: string;
    user_id?: string;
    company_name?: string;
    to_email?: string;
    subject?: string;
    body?: string;
    status: string;
    created_at?: string;
    sent_at?: string;
    error?: unknown;
}
export declare const EmailQueueSchema: import("mongoose").Schema<EmailQueueItem, import("mongoose").Model<EmailQueueItem, any, any, any, import("mongoose").Document<unknown, any, EmailQueueItem, any, {}> & EmailQueueItem & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, EmailQueueItem, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<EmailQueueItem>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<EmailQueueItem> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
