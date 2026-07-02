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
const tasks_service_1 = require("../tasks/tasks.service");
const task_events_1 = require("../tasks/task-events");
const task_status_enum_1 = require("../tasks/dto/task-status.enum");
const sse_service_1 = require("../sse/sse.service");
const campaign_schema_1 = require("./schemas/campaign.schema");
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
    constructor(campaigns, tasks, taskEvents, sse) {
        this.campaigns = campaigns;
        this.tasks = tasks;
        this.taskEvents = taskEvents;
        this.sse = sse;
    }
    onModuleInit() {
        this.taskEvents.completed$.subscribe((task) => {
            void this.onTaskCompleted(task).catch((e) => this.log('error', task, `orchestrator error: ${e?.message ?? e}`));
        });
    }
    async run(dto) {
        const campaignId = `CAMP-${(0, crypto_1.randomBytes)(4).toString('hex')}`;
        const now = new Date().toISOString();
        await this.campaigns.create({
            campaign_id: campaignId,
            keyword: dto.keyword,
            location: dto.location,
            target_count: dto.targetCount,
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
            for (const leadId of leadIds) {
                await this.enqueueStage('enrich', campaignId, { lead_object_id: leadId });
            }
            if (leadIds.length === 0)
                await this.finish(campaign, '搜尋 0 結果');
            return;
        }
        const next = STAGE_NEXT[stage];
        if (next) {
            await this.enqueueStage(next, campaignId, {
                lead_object_id: params.lead_object_id,
            });
        }
        else {
            campaign.done_count += 1;
            campaign._updated_at = new Date().toISOString();
            await campaign.save();
            this.progress(campaignId, 'pipeline', campaign.done_count, campaign.lead_ids.length);
            if (campaign.done_count >= campaign.lead_ids.length) {
                await this.finish(campaign, '全部 lead 完成');
            }
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
        sse_service_1.SseService])
], HermesService);
//# sourceMappingURL=hermes.service.js.map