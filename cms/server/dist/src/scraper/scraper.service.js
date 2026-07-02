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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperService = void 0;
const common_1 = require("@nestjs/common");
const leads_service_1 = require("../leads/leads.service");
const tasks_service_1 = require("../tasks/tasks.service");
const task_status_enum_1 = require("../tasks/dto/task-status.enum");
let ScraperService = class ScraperService {
    leads;
    tasks;
    constructor(leads, tasks) {
        this.leads = leads;
        this.tasks = tasks;
    }
    async enrich(id) {
        const lead = await this.leads.findOne(id);
        const task = await this.tasks.enqueue({
            skill_id: task_status_enum_1.SKILL.ANALYZE,
            title: `Enrich：${lead.company_name}`,
            params: {
                mode: 'enrich',
                lead_id: lead.lead_id,
                lead_object_id: id,
                website: lead.website,
            },
        });
        return { task_id: task.task_id, status: task.status, lead_id: lead.lead_id };
    }
};
exports.ScraperService = ScraperService;
exports.ScraperService = ScraperService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [leads_service_1.LeadsService,
        tasks_service_1.TasksService])
], ScraperService);
//# sourceMappingURL=scraper.service.js.map