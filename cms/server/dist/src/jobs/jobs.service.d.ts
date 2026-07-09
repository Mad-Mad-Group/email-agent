import { Model } from 'mongoose';
import { TasksService } from '../tasks/tasks.service';
import { SseService } from '../sse/sse.service';
import { LeadDocument } from '../leads/schemas/lead.schema';
export declare class JobsService {
    private readonly leadModel;
    private readonly tasks;
    private readonly sse;
    private readonly logger;
    constructor(leadModel: Model<LeadDocument>, tasks: TasksService, sse: SseService);
    reapStalledTasks(): Promise<{
        requeued: number;
    }>;
    requeueOldPending(): Promise<{
        refreshed: number;
    }>;
    private _demoMode;
    private _demoTimer;
    get demoMode(): boolean;
    toggleDemoMode(): {
        demoMode: boolean;
    };
    checkReplies(): Promise<{
        task_id: string;
    }>;
    checkFollowups(): Promise<{
        task_id: string;
    }>;
    fillGaps(): Promise<{
        enqueued: number;
    }>;
    run(name: string): Promise<{
        requeued: number;
    } | {
        refreshed: number;
    } | {
        task_id: string;
    } | {
        enqueued: number;
    }>;
    private runJob;
}
