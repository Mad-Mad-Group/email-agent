import { TasksService } from './tasks.service';
import { EnqueueTaskDto, ClaimTaskDto, CompleteTaskDto, FailTaskDto, ListTasksQueryDto } from './dto/task-dtos';
export declare class TasksController {
    private readonly tasks;
    constructor(tasks: TasksService);
    list(q: ListTasksQueryDto): Promise<{
        items: (import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, import("./schemas/task.schema").Task, {}, {}> & import("./schemas/task.schema").Task & {
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
    stats(): Promise<Record<string, unknown>[]>;
    get(taskId: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/task.schema").Task, {}, {}> & import("./schemas/task.schema").Task & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    enqueue(dto: EnqueueTaskDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/task.schema").Task, {}, {}> & import("./schemas/task.schema").Task & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    claim(dto: ClaimTaskDto): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/task.schema").Task, {}, {}> & import("./schemas/task.schema").Task & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
    complete(taskId: string, dto: CompleteTaskDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/task.schema").Task, {}, {}> & import("./schemas/task.schema").Task & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    fail(taskId: string, dto: FailTaskDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/task.schema").Task, {}, {}> & import("./schemas/task.schema").Task & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
}
