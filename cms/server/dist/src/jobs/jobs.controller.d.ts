import { JobsService } from './jobs.service';
export declare class JobsController {
    private readonly jobs;
    constructor(jobs: JobsService);
    run(name: string): Promise<{
        requeued: number;
    } | {
        refreshed: number;
    } | {
        task_id: string;
    }>;
    toggleDemoMode(): {
        demoMode: boolean;
    };
    getDemoMode(): {
        demoMode: boolean;
    };
}
