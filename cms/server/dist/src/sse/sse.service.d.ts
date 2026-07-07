import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
export declare enum SseEvent {
    LEAD_UPDATE = "lead_update",
    EMAIL_UPDATE = "email_update",
    NOTIFICATION = "notification",
    TASK_UPDATE = "task_update",
    HERMES_LOG = "hermes_log",
    PIPELINE_PROGRESS = "pipeline_progress"
}
export interface SsePayloads {
    [SseEvent.LEAD_UPDATE]: {
        id: string;
        action: 'created' | 'updated' | 'status_changed' | 'deleted';
        status?: string;
    };
    [SseEvent.EMAIL_UPDATE]: {
        id: string;
        action: 'created' | 'updated' | 'status_changed';
        status?: string;
    };
    [SseEvent.NOTIFICATION]: {
        title: string;
        type?: string;
    };
    [SseEvent.TASK_UPDATE]: {
        id: string;
        action: 'created' | 'completed' | 'failed';
    };
    [SseEvent.HERMES_LOG]: {
        runId: string;
        level: 'info' | 'warn' | 'error';
        stage: string;
        message: string;
    };
    [SseEvent.PIPELINE_PROGRESS]: {
        runId: string;
        stage: string;
        current: number;
        total: number;
        percent: number;
    };
}
export declare class SseService {
    private readonly stream$;
    emit<E extends SseEvent>(event: E, data: SsePayloads[E]): void;
    asObservable(): Observable<MessageEvent>;
}
