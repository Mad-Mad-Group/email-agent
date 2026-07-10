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
exports.HermesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const crypto_1 = require("crypto");
const config_1 = require("@nestjs/config");
const tasks_service_1 = require("../tasks/tasks.service");
const task_events_1 = require("../tasks/task-events");
const task_status_enum_1 = require("../tasks/dto/task-status.enum");
const sse_service_1 = require("../sse/sse.service");
const campaign_schema_1 = require("./schemas/campaign.schema");
const email_service_1 = require("../email/email.service");
const users_service_1 = require("../users/users.service");
const MAX_STAGE_RETRIES = 2;
const STAGE_SKILL = {
    search: task_status_enum_1.SKILL.SEARCH,
    enrich: task_status_enum_1.SKILL.ANALYZE,
    analyze: task_status_enum_1.SKILL.ANALYZE,
    draft: task_status_enum_1.SKILL.EMAIL_DRAFT,
    send: task_status_enum_1.SKILL.EMAIL_SEND,
};
const STAGE_NEXT = {
    search: 'enrich',
    enrich: 'analyze',
    analyze: 'draft',
    draft: 'send',
    send: null,
};
let HermesService = class HermesService {
    campaigns;
    tasks;
    taskEvents;
    sse;
    email;
    config;
    users;
    constructor(campaigns, tasks, taskEvents, sse, email, config, users) {
        this.campaigns = campaigns;
        this.tasks = tasks;
        this.taskEvents = taskEvents;
        this.sse = sse;
        this.email = email;
        this.config = config;
        this.users = users;
    }
    onModuleInit() {
        this.taskEvents.completed$.subscribe((task) => {
            void this.onTaskCompleted(task).catch((e) => this.log('error', task, `orchestrator error: ${e?.message ?? e}`));
        });
        this.taskEvents.failed$.subscribe((task) => {
            void this.onTaskFailed(task).catch((e) => this.log('error', task, `orchestrator fail-handler error: ${e?.message ?? e}`));
        });
    }
    async run(dto, userId) {
        const campaignId = `CAMP-${(0, crypto_1.randomBytes)(4).toString('hex')}`;
        const now = new Date().toISOString();
        const mode = dto.mode || 'normal';
        await this.campaigns.create({
            campaign_id: campaignId,
            keyword: dto.keyword,
            location: dto.location,
            target_count: dto.targetCount,
            mode,
            user_id: userId,
            status: 'running',
            pipeline_stage: 'search',
            lead_ids: [],
            done_count: 0,
            _created_at: now,
            _updated_at: now,
        });
        const task = await this.enqueueStage('search', campaignId, {
            keyword: dto.keyword,
            location: dto.location,
            target_count: dto.targetCount,
            mode,
            user_id: userId,
        });
        this.sse.emit(sse_service_1.SseEvent.HERMES_LOG, {
            runId: campaignId,
            level: 'info',
            stage: 'search',
            message: `Pipeline 開始：${dto.keyword} ${dto.location}`,
        });
        return { campaign_id: campaignId, first_task: task.task_id };
    }
    async onTaskCompleted(task) {
        const params = (task.params ?? {});
        const campaignId = params.campaign_id;
        const stage = params.pipeline_stage;
        if (!campaignId || !stage)
            return;
        const campaign = await this.campaigns
            .findOne({ campaign_id: campaignId })
            .exec();
        if (!campaign || campaign.status !== 'running')
            return;
        const result = (task.result ?? {});
        if (stage === 'search') {
            const leadIds = result.lead_object_ids ?? [];
            campaign.lead_ids = leadIds;
            campaign.pipeline_stage = 'per_lead';
            campaign._updated_at = new Date().toISOString();
            await campaign.save();
            this.progress(campaignId, 'search→enrich', 0, leadIds.length);
            const userId = params.user_id;
            for (const leadId of leadIds) {
                await this.enqueueStage('enrich', campaignId, { lead_object_id: leadId, user_id: userId });
            }
            if (leadIds.length === 0)
                await this.finish(campaign, '搜尋 0 結果');
            return;
        }
        const next = STAGE_NEXT[stage];
        if (next) {
            await this.enqueueStage(next, campaignId, {
                lead_object_id: params.lead_object_id,
                user_id: params.user_id,
            });
        }
        else {
            const updated = await this.campaigns.findOneAndUpdate({ campaign_id: campaignId, status: 'running' }, { $inc: { done_count: 1 }, $set: { _updated_at: new Date().toISOString() } }, { new: true }).exec();
            if (!updated)
                return;
            this.progress(campaignId, 'pipeline', updated.done_count, updated.lead_ids.length);
            if (updated.done_count >= updated.lead_ids.length) {
                await this.finish(updated, '全部 lead 完成');
            }
        }
    }
    async onTaskFailed(task) {
        const params = (task.params ?? {});
        const campaignId = params.campaign_id;
        const stage = params.pipeline_stage;
        if (!campaignId || !stage)
            return;
        const campaign = await this.campaigns
            .findOne({ campaign_id: campaignId })
            .exec();
        if (!campaign || campaign.status !== 'running')
            return;
        const errorMsg = task.error || 'unknown error';
        const retryCount = params.retry_count || 0;
        if (retryCount < MAX_STAGE_RETRIES) {
            const attempt = retryCount + 1;
            this.sse.emit(sse_service_1.SseEvent.HERMES_LOG, {
                runId: campaignId,
                level: 'warn',
                stage,
                message: `Stage [${stage}] 失敗（第 ${attempt}/${MAX_STAGE_RETRIES} 次重試）：${errorMsg}`,
            });
            const { campaign_id, pipeline_stage, retry_count: _rc, ...rest } = params;
            await this.enqueueStage(stage, campaignId, { ...rest, retry_count: attempt });
            return;
        }
        this.sse.emit(sse_service_1.SseEvent.HERMES_LOG, {
            runId: campaignId,
            level: 'error',
            stage,
            message: `Stage [${stage}] 重試 ${MAX_STAGE_RETRIES} 次仍失敗，跳過此 lead：${errorMsg}`,
        });
        if (stage === 'search') {
            await this.finish(campaign, `搜尋失敗：${errorMsg}`);
            return;
        }
        const updated = await this.campaigns.findOneAndUpdate({ campaign_id: campaignId, status: 'running' }, { $inc: { done_count: 1 }, $set: { _updated_at: new Date().toISOString() } }, { new: true }).exec();
        if (!updated)
            return;
        this.progress(campaignId, 'pipeline', updated.done_count, updated.lead_ids.length);
        if (updated.done_count >= updated.lead_ids.length) {
            await this.finish(updated, '全部 lead 處理完畢（部分可能失敗）');
        }
    }
    async enqueueStage(stage, campaignId, extra = {}) {
        return this.tasks.enqueue({
            skill_id: STAGE_SKILL[stage],
            title: `[${campaignId}] ${stage}`,
            params: { campaign_id: campaignId, pipeline_stage: stage, ...extra },
        });
    }
    async finish(campaign, why) {
        campaign.status = 'completed';
        campaign._updated_at = new Date().toISOString();
        await campaign.save();
        this.sse.emit(sse_service_1.SseEvent.HERMES_LOG, {
            runId: campaign.campaign_id,
            level: 'info',
            stage: 'complete',
            message: `Pipeline 完成（${why}）`,
        });
        void this.maybeNotifyCompletion(campaign, why).catch((e) => this.sse.emit(sse_service_1.SseEvent.HERMES_LOG, {
            runId: campaign.campaign_id,
            level: 'warn',
            stage: 'notify',
            message: `Email 通知失敗：${e?.message ?? e}`,
        }));
    }
    async maybeNotifyCompletion(campaign, why) {
        if (campaign.user_id) {
            try {
                const prefs = await this.users.getNotificationPrefs(campaign.user_id);
                if (!prefs.email_on_complete)
                    return;
            }
            catch {
                return;
            }
        }
        else {
            return;
        }
        await this.notifyCompletion(campaign, why);
    }
    async notifyCompletion(campaign, why) {
        const to = this.config.get('SMTP_TO') || 's1165449@s.eduhk.hk';
        const subject = `[Lead Scraper] 搜尋完成：${campaign.keyword} ${campaign.location} (${campaign.lead_ids.length} leads)`;
        const html = `
      <h2>Pipeline 完成</h2>
      <ul>
        <li><b>Campaign ID</b>: ${campaign.campaign_id}</li>
        <li><b>關鍵字</b>: ${campaign.keyword}</li>
        <li><b>地點</b>: ${campaign.location}</li>
        <li><b>目標數量</b>: ${campaign.target_count}</li>
        <li><b>找到 Leads</b>: ${campaign.lead_ids.length}</li>
        <li><b>完成時間</b>: ${campaign._updated_at}</li>
        <li><b>備註</b>: ${why}</li>
      </ul>
      <p>👉 <a href="http://localhost:5173/cms-search">睇結果</a></p>
    `;
        await this.email.sendMail(to, subject, html);
    }
    async getCampaign(id) {
        return this.campaigns.findOne({ campaign_id: id }).lean().exec();
    }
    progress(runId, stage, current, total) {
        this.sse.emit(sse_service_1.SseEvent.PIPELINE_PROGRESS, {
            runId,
            stage,
            current,
            total,
            percent: total ? Math.round((current / total) * 100) : 100,
        });
    }
    log(level, task, msg) {
        this.sse.emit(sse_service_1.SseEvent.HERMES_LOG, {
            runId: task.params?.campaign_id ?? task.task_id,
            level,
            stage: 'orchestrator',
            message: msg,
        });
    }
};
exports.HermesService = HermesService;
exports.HermesService = HermesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(campaign_schema_1.Campaign.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        tasks_service_1.TasksService,
        task_events_1.TaskEvents,
        sse_service_1.SseService,
        email_service_1.EmailService,
        config_1.ConfigService,
        users_service_1.UsersService])
], HermesService);
//# sourceMappingURL=hermes.service.js.map