import { Model } from 'mongoose';
import { Task, TaskDocument } from './schemas/task.schema';
import { EnqueueTaskDto, ClaimTaskDto, ListTasksQueryDto } from './dto/task-dtos';
import { SseService } from '../sse/sse.service';
import { TaskEvents } from './task-events';
export declare class TasksService {
    private readonly model;
    private readonly sse;
    private readonly events;
    constructor(model: Model<TaskDocument>, sse: SseService, events: TaskEvents);
    enqueue(dto: EnqueueTaskDto): Promise<TaskDocument>;
    findAll(q: ListTasksQueryDto): Promise<{
        items: (import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, Task, {}, {}> & Task & {
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
    findByTaskId(taskId: string): Promise<TaskDocument>;
    findActiveOrRecent(skillId: string, paramsMatch: Record<string, unknown>, cooldownMs?: number): Promise<TaskDocument | null>;
    claimNext(dto: ClaimTaskDto): Promise<TaskDocument | null>;
    complete(taskId: string, result?: Record<string, unknown>): Promise<TaskDocument>;
    fail(taskId: string, error?: string): Promise<TaskDocument>;
    requeueStalled(maxAgeMinutes: number): Promise<number>;
    requeueOldPending(maxAgeMinutes: number): Promise<number>;
    stats(): Promise<Record<string, unknown>[]>;
    private nowIso;
}
