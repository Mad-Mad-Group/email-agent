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
exports.AiAnalysisService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const leads_service_1 = require("../leads/leads.service");
const tasks_service_1 = require("../tasks/tasks.service");
const task_status_enum_1 = require("../tasks/dto/task-status.enum");
const analysis_schema_1 = require("./schemas/analysis.schema");
let AiAnalysisService = class AiAnalysisService {
    analysisModel;
    leads;
    tasks;
    constructor(analysisModel, leads, tasks) {
        this.analysisModel = analysisModel;
        this.leads = leads;
        this.tasks = tasks;
    }
    async analyzeLead(id, userId) {
        const lead = await this.leads.findOne(id);
        const task = await this.tasks.enqueue({
            skill_id: task_status_enum_1.SKILL.ANALYZE,
            title: `分析：${lead.company_name}`,
            params: { lead_id: lead.lead_id, lead_object_id: id, user_id: userId },
        });
        return { task_id: task.task_id, status: task.status, lead_id: lead.lead_id };
    }
    async listForLead(id) {
        const lead = await this.leads.findOne(id);
        if (!lead.lead_id)
            return [];
        return this.analysisModel
            .find({ lead_id: lead.lead_id })
            .sort({ _analyzed_at: -1 })
            .lean()
            .exec();
    }
};
exports.AiAnalysisService = AiAnalysisService;
exports.AiAnalysisService = AiAnalysisService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(analysis_schema_1.Analysis.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        leads_service_1.LeadsService,
        tasks_service_1.TasksService])
], AiAnalysisService);
//# sourceMappingURL=ai-analysis.service.js.map