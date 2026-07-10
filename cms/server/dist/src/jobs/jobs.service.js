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
var JobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const schedule_1 = require("@nestjs/schedule");
const tasks_service_1 = require("../tasks/tasks.service");
const task_status_enum_1 = require("../tasks/dto/task-status.enum");
const sse_service_1 = require("../sse/sse.service");
const lead_schema_1 = require("../leads/schemas/lead.schema");
const STALLED_MINUTES = 15;
const STALE_PENDING_MINUTES = 30;
let JobsService = JobsService_1 = class JobsService {
    leadModel;
    tasks;
    sse;
    logger = new common_1.Logger(JobsService_1.name);
    constructor(leadModel, tasks, sse) {
        this.leadModel = leadModel;
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
    _demoMode = false;
    _demoTimer = null;
    get demoMode() { return this._demoMode; }
    toggleDemoMode() {
        this._demoMode = !this._demoMode;
        if (this._demoMode) {
            this.logger.log('[demo] 開啟 Demo 模式 — 每 10 秒 check replies');
            this._demoTimer = setInterval(() => {
                this.checkReplies().catch(() => { });
            }, 10_000);
        }
        else {
            this.logger.log('[demo] 關閉 Demo 模式 — 恢復 30 分鐘 cron');
            if (this._demoTimer) {
                clearInterval(this._demoTimer);
                this._demoTimer = null;
            }
        }
        return { demoMode: this._demoMode };
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
    async fillGaps() {
        return this.runJob('gap-filler', async () => {
            let enqueued = 0;
            const BATCH = 20;
            const needEnrich = await this.leadModel.find({
                _deleted_at: null,
                _website_researched: { $ne: true },
                website: { $exists: true, $nin: [null, ''] },
            }).select('_id user_id').limit(BATCH).lean().exec();
            for (const lead of needEnrich) {
                if (enqueued >= BATCH)
                    break;
                const dup = await this.tasks.findActiveOrRecent(task_status_enum_1.SKILL.ANALYZE, { lead_object_id: lead._id.toString() }, 300_000);
                if (dup)
                    continue;
                await this.tasks.enqueue({
                    skill_id: task_status_enum_1.SKILL.ANALYZE,
                    title: `[gap-filler] enrich+analyze lead`,
                    params: { lead_object_id: lead._id.toString(), user_id: lead.user_id, gap_fill: true },
                });
                enqueued++;
            }
            const needDraft = await this.leadModel.find({
                _deleted_at: null,
                _has_analysis: true,
                _has_email_draft: { $ne: true },
                email: { $exists: true, $nin: [null, ''] },
            }).select('_id user_id').limit(BATCH - enqueued).lean().exec();
            for (const lead of needDraft) {
                if (enqueued >= BATCH)
                    break;
                const dup = await this.tasks.findActiveOrRecent(task_status_enum_1.SKILL.EMAIL_DRAFT, { lead_object_id: lead._id.toString() }, 300_000);
                if (dup)
                    continue;
                await this.tasks.enqueue({
                    skill_id: task_status_enum_1.SKILL.EMAIL_DRAFT,
                    title: `[gap-filler] draft email`,
                    params: { lead_object_id: lead._id.toString(), user_id: lead.user_id, gap_fill: true },
                });
                enqueued++;
            }
            const needSend = await this.leadModel.find({
                _deleted_at: null,
                _has_email_draft: true,
                _email_sent: { $ne: true },
                email: { $exists: true, $nin: [null, ''] },
            }).select('_id user_id').limit(BATCH - enqueued).lean().exec();
            for (const lead of needSend) {
                if (enqueued >= BATCH)
                    break;
                const dup = await this.tasks.findActiveOrRecent(task_status_enum_1.SKILL.EMAIL_SEND, { lead_object_id: lead._id.toString() }, 300_000);
                if (dup)
                    continue;
                await this.tasks.enqueue({
                    skill_id: task_status_enum_1.SKILL.EMAIL_SEND,
                    title: `[gap-filler] send email`,
                    params: { lead_object_id: lead._id.toString(), user_id: lead.user_id, gap_fill: true },
                });
                enqueued++;
            }
            return { enqueued };
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
            case 'gap-filler':
                return this.fillGaps();
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
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JobsService.prototype, "fillGaps", null);
exports.JobsService = JobsService = JobsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(lead_schema_1.Lead.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        tasks_service_1.TasksService,
        sse_service_1.SseService])
], JobsService);
//# sourceMappingURL=jobs.service.js.map