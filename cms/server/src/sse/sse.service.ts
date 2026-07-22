import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

/**
 * 三種即時事件（同 A 約定嘅合約）。
 * 前端用 EventSource.addEventListener('<事件名>', cb) 收。
 */
export enum SseEvent {
  LEAD_UPDATE = 'lead_update', // lead 增/改/狀態變/刪
  EMAIL_UPDATE = 'email_update', // email queue 增/改
  NOTIFICATION = 'notification', // 新通知
  TASK_UPDATE = 'task_update', // task 狀態變更
  HERMES_LOG = 'hermes_log', // Hermes pipeline 逐步 log
  PIPELINE_PROGRESS = 'pipeline_progress', // 進度條
}

/** 各事件 payload 型別（俾 A 對） */
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
    msgKey?: string;
    msgParams?: Record<string, unknown>;
  };
  [SseEvent.PIPELINE_PROGRESS]: {
    runId: string;
    stage: string;
    current: number;
    total: number;
    percent: number;
  };
}

/**
 * 全 app 共用嘅事件 bus。任何 module inject 咗就可以 emit。
 * 單一 Subject 廣播俾所有連住 /api/events 嘅前端。
 */
@Injectable()
export class SseService {
  private readonly stream$ = new Subject<MessageEvent>();

  emit<E extends SseEvent>(event: E, data: SsePayloads[E]): void {
    // NestJS @Sse：MessageEvent.type = SSE event 名，data 會自動 JSON.stringify
    this.stream$.next({ type: event, data: data as Record<string, unknown> });
  }

  asObservable(): Observable<MessageEvent> {
    return this.stream$.asObservable();
  }
}
