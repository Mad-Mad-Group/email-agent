"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const crypto_1 = require("crypto");
const task_schema_1 = require("./schemas/task.schema");
const task_status_enum_1 = require("./dto/task-status.enum");
const sse_service_1 = require("../sse/sse.service");
const task_events_1 = require("./task-events");
let TasksService = class TasksService {
    model;
    sse;
    events;
    constructor(model, sse, events) {
        this.model = model;
        this.sse = sse;
        this.events = events;
    }
    async enqueue(dto) {
        const task = await this.model.create({
            task_id: `TASK-${(0, crypto_1.randomBytes)(4).toString('hex')}`,
            title: dto.title,
            skill_id: dto.skill_id,
            params: dto.params ?? {},
            priority: dto.priority ?? 'normal',
            status: task_status_enum_1.TaskStatus.PENDING,
            created_by: dto.created_by,
            _created_at: this.nowIso(),
            _updated_at: this.nowIso(),
        });
        this.sse.emit(sse_service_1.SseEvent.HERMES_LOG, {
            runId: task.task_id,
            level: 'info',
            stage: 'queue',
            message: `已派工 ${task.skill_id}：${task.title ?? ''}`,
        });
        return task;
    }
    async findAll(q) {
        const filter = {};
        if (q.status)
            filter.status = q.status;
        if (q.skill_id)
            filter.skill_id = q.skill_id;
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
    async findByTaskId(taskId) {
        const t = await this.model.findOne({ task_id: taskId }).exec();
        if (!t)
            throw new common_1.NotFoundException('Task not found');
        return t;
    }
    async findActiveOrRecent(skillId, paramsMatch, cooldownMs = 60_000) {
        const cutoff = new Date(Date.now() - cooldownMs).toISOString();
        const filter = { skill_id: skillId };
        for (const [k, v] of Object.entries(paramsMatch)) {
            filter[`params.${k}`] = v;
        }
        filter.$or = [
            { status: { $in: [task_status_enum_1.TaskStatus.PENDING, task_status_enum_1.TaskStatus.RUNNING] } },
            { _created_at: { $gte: cutoff } },
        ];
        return this.model.findOne(filter).sort({ _created_at: -1 }).exec();
    }
    async claimNext(dto) {
        const filter = { status: task_status_enum_1.TaskStatus.PENDING };
        if (dto.skill_id)
            filter.skill_id = dto.skill_id;
        if (dto.exclude_skills) {
            const excluded = dto.exclude_skills.split(',').map(s => s.trim()).filter(Boolean);
            if (excluded.length)
                filter.skill_id = { ...((filter.skill_id && typeof filter.skill_id === 'string') ? { $eq: filter.skill_id } : {}), $nin: excluded };
        }
        const task = await this.model
            .findOneAndUpdate(filter, {
            $set: {
                status: task_status_enum_1.TaskStatus.RUNNING,
                assigned_agent_id: dto.agent_id,
                _assigned_at: this.nowIso(),
                _updated_at: this.nowIso(),
            },
        }, { sort: { priority: -1, _created_at: 1 }, new: true })
            .exec();
        if (task) {
            this.sse.emit(sse_service_1.SseEvent.HERMES_LOG, {
                runId: task.task_id,
                level: 'info',
                stage: 'claim',
                message: `${dto.agent_id} 接咗 ${task.task_id}`,
            });
        }
        return task;
    }
    async complete(taskId, result) {
        const task = await this.model.findOneAndUpdate({ task_id: taskId, status: task_status_enum_1.TaskStatus.RUNNING }, {
            $set: {
                status: task_status_enum_1.TaskStatus.COMPLETED,
                result: result ?? {},
                _updated_at: this.nowIso(),
            },
        }, { new: true }).exec();
        if (!task) {
            throw new common_1.BadRequestException(`Task ${taskId} 唔係 running 或唔存在`);
        }
        this.sse.emit(sse_service_1.SseEvent.HERMES_LOG, {
            runId: task.task_id,
            level: 'info',
            stage: 'done',
            message: `${task.task_id} 完成`,
        });
        this.events.emitCompleted(task);
        return task;
    }
    async fail(taskId, error) {
        const task = await this.model.findOneAndUpdate({ task_id: taskId, status: task_status_enum_1.TaskStatus.RUNNING }, {
            $set: {
                status: task_status_enum_1.TaskStatus.FAILED,
                error: { message: error ?? 'unknown' },
                _updated_at: this.nowIso(),
            },
        }, { new: true }).exec();
        if (!task) {
            throw new common_1.BadRequestException(`Task ${taskId} 唔係 running 或唔存在`);
        }
        this.sse.emit(sse_service_1.SseEvent.HERMES_LOG, {
            runId: task.task_id,
            level: 'error',
            stage: 'failed',
            message: `${task.task_id} 失敗：${error ?? ''}`,
        });
        this.events.emitFailed(task);
        return task;
    }
    async requeueStalled(maxAgeMinutes) {
        const cutoff = new Date(Date.now() - maxAgeMinutes * 60_000).toISOString();
        const res = await this.model.updateMany({ status: task_status_enum_1.TaskStatus.RUNNING, _assigned_at: { $lt: cutoff } }, {
            $set: {
                status: task_status_enum_1.TaskStatus.PENDING,
                assigned_agent_id: null,
                _updated_at: this.nowIso(),
            },
        });
        return res.modifiedCount ?? 0;
    }
    async requeueOldPending(maxAgeMinutes) {
        const cutoff = new Date(Date.now() - maxAgeMinutes * 60_000).toISOString();
        const res = await this.model.updateMany({ status: task_status_enum_1.TaskStatus.PENDING, _created_at: { $lt: cutoff } }, { $set: { _created_at: this.nowIso(), _updated_at: this.nowIso() } });
        return res.modifiedCount ?? 0;
    }
    async stats() {
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
    nowIso() {
        return new Date().toISOString();
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(task_schema_1.Task.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        sse_service_1.SseService,
        task_events_1.TaskEvents])
], TasksService);
//# sourceMappingURL=tasks.service.js.map