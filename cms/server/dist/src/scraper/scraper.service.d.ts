import { LeadsService } from '../leads/leads.service';
import { TasksService } from '../tasks/tasks.service';
export declare class ScraperService {
    private readonly leads;
    private readonly tasks;
    constructor(leads: LeadsService, tasks: TasksService);
    enrich(id: string): Promise<{
        task_id: string;
        status: string;
        lead_id: string | undefined;
    }>;
}
