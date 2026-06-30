import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { TaskDocument } from './schemas/task.schema';

/**
 * Task 完成/失敗嘅 in-process 事件 bus。
 * TasksService 喺 complete/fail 時 publish；Hermes orchestrator subscribe 嚟串下一 stage。
 * 咁 Tasks 完全唔需要知道 Hermes 存在（解耦，避免 circular dep）。
 */
@Injectable()
export class TaskEvents {
  readonly completed$ = new Subject<TaskDocument>();
  readonly failed$ = new Subject<TaskDocument>();

  emitCompleted(task: TaskDocument): void {
    this.completed$.next(task);
  }
  emitFailed(task: TaskDocument): void {
    this.failed$.next(task);
  }
}
