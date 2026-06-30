import { Subject } from 'rxjs';
import { TaskDocument } from './schemas/task.schema';
export declare class TaskEvents {
    readonly completed$: Subject<import("mongoose").Document<unknown, {}, import("./schemas/task.schema").Task, {}, {}> & import("./schemas/task.schema").Task & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    readonly failed$: Subject<import("mongoose").Document<unknown, {}, import("./schemas/task.schema").Task, {}, {}> & import("./schemas/task.schema").Task & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    emitCompleted(task: TaskDocument): void;
    emitFailed(task: TaskDocument): void;
}
