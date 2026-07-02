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
var JobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const tasks_service_1 = require("../tasks/tasks.service");
const task_status_enum_1 = require("../tasks/dto/task-status.enum");
const sse_service_1 = require("../sse/sse.service");
const STALLED_MINUTES = 15;
const STALE_PENDING_MINUTES = 30;
let JobsService = JobsService_1 = class JobsService {
    tasks;
    sse;
    logger = new common_1.Logger(JobsService_1.name);
    constructor(tasks, sse) {
        this.tasks = tasks;
        this.sse = sse;
    }
    async reapStalledTasks() {
        return this.runJob('reap-stalled-tasks', async () => {
            const n = await this.tasks.requeueStalled(STALLED_MINUTES);
            return { requeued: n };
        });
    }
    async requeueOldPending() {
        return this.runJob('requeue-old-pending', async () => {
            const n = await this.tasks.requeueOldPending(STALE_PENDING_MINUTES);
            return { refreshed: n };
        });
    }
    async checkReplies() {
        return this.runJob('check-replies', async () => {
            const task = await this.tasks.enqueue({
                skill_id: task_status_enum_1.SKILL.EMAIL_SEND,
                title: '定時檢查回覆',
                params: { mode: 'reply_check' },
            });
            return { task_id: task.task_id };
        });
    }
    async checkFollowups() {
        return this.runJob('check-followups', async () => {
            const task = await this.tasks.enqueue({
                skill_id: task_status_enum_1.SKILL.EMAIL_SEND,
                title: '定時檢查跟進',
                params: { mode: 'check_followups' },
            });
            return { task_id: task.task_id };
        });
    }
    async run(name) {
        switch (name) {
            case 'reap-stalled-tasks':
                return this.reapStalledTasks();
            case 'requeue-old-pending':
                return this.requeueOldPending();
            case 'check-replies':
                return this.checkReplies();
            case 'check-followups':
                return this.checkFollowups();
            default:
                throw new Error(`Unknown job: ${name}`);
        }
    }
    async runJob(name, fn) {
        const startedAt = Date.now();
        this.logger.log(`[job:${name}] start`);
        try {
            const result = await fn();
            const ms = Date.now() - startedAt;
            this.logger.log(`[job:${name}] done in ${ms}ms ${JSON.stringify(result)}`);
            this.sse.emit(sse_service_1.SseEvent.HERMES_LOG, {
                runId: `job:${name}`,
                level: 'info',
                stage: 'job',
                message: `${name} 完成 ${JSON.stringify(result)}`,
            });
            return result;
        }
        catch (e) {
            this.logger.error(`[job:${name}] error: ${e?.message ?? e}`);
            this.sse.emit(sse_service_1.SseEvent.HERMES_LOG, {
                runId: `job:${name}`,
                level: 'error',
                stage: 'job',
                message: `${name} 失敗：${e?.message ?? e}`,
            });
            throw e;
        }
    }
};
exports.JobsService = JobsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JobsService.prototype, "reapStalledTasks", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JobsService.prototype, "requeueOldPending", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JobsService.prototype, "checkReplies", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_10AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JobsService.prototype, "checkFollowups", null);
exports.JobsService = JobsService = JobsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tasks_service_1.TasksService,
        sse_service_1.SseService])
], JobsService);
//# sourceMappingURL=jobs.service.js.map