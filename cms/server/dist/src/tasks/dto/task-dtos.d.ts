import { TaskStatus } from './task-status.enum';
export declare class EnqueueTaskDto {
    skill_id: string;
    title?: string;
    params?: Record<string, unknown>;
    priority?: string;
    created_by?: string;
}
export declare class ClaimTaskDto {
    agent_id: string;
    skill_id?: string;
    exclude_skills?: string;
}
export declare class CompleteTaskDto {
    result?: Record<string, unknown>;
}
export declare class FailTaskDto {
    error?: string;
}
export declare class ListTasksQueryDto {
    page: number;
    limit: number;
    status?: TaskStatus;
    skill_id?: string;
}
