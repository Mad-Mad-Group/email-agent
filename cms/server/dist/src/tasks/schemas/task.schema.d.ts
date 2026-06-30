import { HydratedDocument } from 'mongoose';
export type TaskDocument = HydratedDocument<Task>;
export declare class Task {
    task_id: string;
    title?: string;
    skill_id?: string;
    params?: Record<string, unknown>;
    priority?: string;
    deadline?: unknown;
    status: string;
    assigned_agent_id?: string;
    created_by?: string;
    result?: unknown;
    error?: unknown;
    _created_at?: string;
    _assigned_at?: string;
    _updated_at?: string;
}
export declare const TaskSchema: import("mongoose").Schema<Task, import("mongoose").Model<Task, any, any, any, import("mongoose").Document<unknown, any, Task, any, {}> & Task & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Task, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Task>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Task> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
