import { TasksService } from '../tasks/tasks.service';
import { SseService } from '../sse/sse.service';
export declare class JobsService {
    private readonly tasks;
    private readonly sse;
    private readonly logger;
    constructor(tasks: TasksService, sse: SseService);
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
    run(name: string): Promise<{
        requeued: number;
    } | {
        refreshed: number;
    } | {
        task_id: string;
    }>;
    private runJob;
}
