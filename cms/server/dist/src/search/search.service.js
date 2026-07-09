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
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const tasks_service_1 = require("../tasks/tasks.service");
const task_status_enum_1 = require("../tasks/dto/task-status.enum");
let SearchService = class SearchService {
    tasks;
    constructor(tasks) {
        this.tasks = tasks;
    }
    async run(dto, userId) {
        const dup = await this.tasks.findActiveOrRecent(task_status_enum_1.SKILL.SEARCH, { keyword: dto.keyword, location: dto.location }, 60_000);
        if (dup) {
            return { task_id: dup.task_id, status: dup.status, deduped: true };
        }
        const task = await this.tasks.enqueue({
            skill_id: task_status_enum_1.SKILL.SEARCH,
            title: `搜尋：${dto.keyword} ${dto.location}（目標 ${dto.targetCount}）`,
            params: {
                keyword: dto.keyword,
                location: dto.location,
                target_count: dto.targetCount,
                user_id: userId,
            },
        });
        return { task_id: task.task_id, status: task.status };
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tasks_service_1.TasksService])
], SearchService);
//# sourceMappingURL=search.service.js.map