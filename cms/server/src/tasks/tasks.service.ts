import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { randomBytes } from 'crypto';
import { Task, TaskDocument } from './schemas/task.schema';
import { TaskStatus } from './dto/task-status.enum';
import {
  EnqueueTaskDto,
  ClaimTaskDto,
  ListTasksQueryDto,
} from './dto/task-dtos';
import { SseEvent, SseService } from '../sse/sse.service';
import { TaskEvents } from './task-events';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private readonly model: Model<TaskDocument>,
    private readonly sse: SseService,
    private readonly events: TaskEvents,
  ) {}

  /** 派工：建一個 pending task，等 Hermes agent claim */
  async enqueue(dto: EnqueueTaskDto): Promise<TaskDocument> {
    const task = await this.model.create({
      task_id: `TASK-${randomBytes(4).toString('hex')}`,
      title: dto.title,
      skill_id: dto.skill_id,
      params: dto.params ?? {},
      priority: dto.priority ?? 'normal',
      status: TaskStatus.PENDING,
      created_by: dto.created_by,
      _created_at: this.nowIso(),
      _updated_at: this.nowIso(),
    });
    this.sse.emit(SseEvent.HERMES_LOG, {
      runId: task.task_id,
      level: 'info',
      stage: 'queue',
      message: `已派工 ${task.skill_id}：${task.title ?? ''}`,
    });
    return task;
  }

  async findAll(q: ListTasksQueryDto) {
    const filter: FilterQuery<TaskDocument> = {};
    if (q.status) filter.status = q.status;
    if (q.skill_id) filter.skill_id = q.skill_id;
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ _created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total, page, limit };
  }

  async findByTaskId(taskId: string): Promise<TaskDocument> {
    const t = await this.model.findOne({ task_id: taskId }).exec();
    if (!t) throw new NotFoundException('Task not found');
    return t;
  }

  /**
   * 防 spam：搵有冇相同 skill + params 嘅 task 仲喺處理中（pending/running），
   * 或者喺 cooldown 內啱啱建立過。有就唔使再 enqueue（同一請求短時間內去重）。
   */
  async findActiveOrRecent(
    skillId: string,
    paramsMatch: Record<string, unknown>,
    cooldownMs = 60_000,
  ): Promise<TaskDocument | null> {
    const cutoff = new Date(Date.now() - cooldownMs).toISOString();
    const filter: FilterQuery<TaskDocument> = { skill_id: skillId };
    for (const [k, v] of Object.entries(paramsMatch)) {
      (filter as Record<string, unknown>)[`params.${k}`] = v;
    }
    filter.$or = [
      { status: { $in: [TaskStatus.PENDING, TaskStatus.RUNNING] } },
      { _created_at: { $gte: cutoff } },
    ];
    return this.model.findOne(filter).sort({ _created_at: -1 }).exec();
  }

  /** Hermes agent 攞下一個 pending task（原子 claim）*/
  async claimNext(dto: ClaimTaskDto): Promise<TaskDocument | null> {
    const filter: FilterQuery<TaskDocument> = { status: TaskStatus.PENDING };
    if (dto.skill_id) filter.skill_id = dto.skill_id;
    const task = await this.model
      .findOneAndUpdate(
        filter,
        {
          $set: {
            status: TaskStatus.RUNNING,
            assigned_agent_id: dto.agent_id,
            _assigned_at: this.nowIso(),
            _updated_at: this.nowIso(),
          },
        },
        { sort: { priority: -1, _created_at: 1 }, new: true },
      )
      .exec();
    if (task) {
      this.sse.emit(SseEvent.HERMES_LOG, {
        runId: task.task_id,
        level: 'info',
        stage: 'claim',
        message: `${dto.agent_id} 接咗 ${task.task_id}`,
      });
    }
    return task;
  }

  /** Hermes agent 回報完成（原子操作，支援多 worker 併發） */
  async complete(
    taskId: string,
    result?: Record<string, unknown>,
  ): Promise<TaskDocument> {
    const task = await this.model.findOneAndUpdate(
      { task_id: taskId, status: TaskStatus.RUNNING },
      {
        $set: {
          status: TaskStatus.COMPLETED,
          result: result ?? {},
          _updated_at: this.nowIso(),
        },
      },
      { new: true },
    ).exec();
    if (!task) {
      throw new BadRequestException(`Task ${taskId} 唔係 running 或唔存在`);
    }
    this.sse.emit(SseEvent.HERMES_LOG, {
      runId: task.task_id,
      level: 'info',
      stage: 'done',
      message: `${task.task_id} 完成`,
    });
    this.events.emitCompleted(task);
    return task;
  }

  async fail(taskId: string, error?: string): Promise<TaskDocument> {
    const task = await this.model.findOneAndUpdate(
      { task_id: taskId, status: TaskStatus.RUNNING },
      {
        $set: {
          status: TaskStatus.FAILED,
          error: { message: error ?? 'unknown' },
          _updated_at: this.nowIso(),
        },
      },
      { new: true },
    ).exec();
    if (!task) {
      throw new BadRequestException(`Task ${taskId} 唔係 running 或唔存在`);
    }
    this.sse.emit(SseEvent.HERMES_LOG, {
      runId: task.task_id,
      level: 'error',
      stage: 'failed',
      message: `${task.task_id} 失敗：${error ?? ''}`,
    });
    this.events.emitFailed(task);
    return task;
  }

  /**
   * 把卡喺 running 太耐嘅 task（agent 死咗）requeue 返 pending。
   * 由 ⑧ Jobs 定時調用。回傳 requeue 咗幾多個。idempotent。
   */
  async requeueStalled(maxAgeMinutes: number): Promise<number> {
    const cutoff = new Date(
      Date.now() - maxAgeMinutes * 60_000,
    ).toISOString();
    const res = await this.model.updateMany(
      { status: TaskStatus.RUNNING, _assigned_at: { $lt: cutoff } },
      {
        $set: {
          status: TaskStatus.PENDING,
          assigned_agent_id: null,
          _updated_at: this.nowIso(),
        },
      },
    );
    return res.modifiedCount ?? 0;
  }

  /**
   * 把【長期 pending】嘅 task reset _created_at = now（等於 fresh start，鼓勵
   * 下次 claim 拎到）。解決 worker 完全 dead 期間堆積嘅 pending task。
   *
   * 注意：唔 set status=pending（已經係 pending），只 refresh created_at。
   * 由 ⑧ Jobs 定時調用。
   */
  async requeueOldPending(maxAgeMinutes: number): Promise<number> {
    const cutoff = new Date(
      Date.now() - maxAgeMinutes * 60_000,
    ).toISOString();
    const res = await this.model.updateMany(
      { status: TaskStatus.PENDING, _created_at: { $lt: cutoff } },
      { $set: { _created_at: this.nowIso(), _updated_at: this.nowIso() } },
    );
    return res.modifiedCount ?? 0;
  }

  /**
   * 按 skill_id 聚合統計：completed / failed / running 數量、成功率、最後完成時間。
   */
  async stats(): Promise<Record<string, unknown>[]> {
    return this.model.aggregate([
      {
        $group: {
          _id: '$skill_id',
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          running: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          last_run: { $max: '$_updated_at' },
        },
      },
      { $sort: { _id: 1 } },
    ]).exec();
  }

  private nowIso(): string {
    return new Date().toISOString();
  }
}
