"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const schedule_1 = require("@nestjs/schedule");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const roles_module_1 = require("./roles/roles.module");
const settings_module_1 = require("./settings/settings.module");
const uploads_module_1 = require("./uploads/uploads.module");
const email_module_1 = require("./email/email.module");
const sse_module_1 = require("./sse/sse.module");
const leads_module_1 = require("./leads/leads.module");
const tasks_module_1 = require("./tasks/tasks.module");
const search_module_1 = require("./search/search.module");
const scraper_module_1 = require("./scraper/scraper.module");
const ai_analysis_module_1 = require("./ai/ai-analysis.module");
const email_queue_module_1 = require("./email-queue/email-queue.module");
const hermes_module_1 = require("./hermes/hermes.module");
const jobs_module_1 = require("./jobs/jobs.module");
const calendar_module_1 = require("./calendar/calendar.module");
const app_controller_1 = require("./app.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            mongoose_1.MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://leadteam:leadteam2026@localhost:27017/lead_scraper'),
            schedule_1.ScheduleModule.forRoot(),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            roles_module_1.RolesModule,
            settings_module_1.SettingsModule,
            uploads_module_1.UploadsModule,
            email_module_1.EmailModule,
            sse_module_1.SseModule,
            leads_module_1.LeadsModule,
            tasks_module_1.TasksModule,
            search_module_1.SearchModule,
            scraper_module_1.ScraperModule,
            ai_analysis_module_1.AiAnalysisModule,
            email_queue_module_1.EmailQueueModule,
            hermes_module_1.HermesModule,
            jobs_module_1.JobsModule,
            calendar_module_1.CalendarModule,
        ],
        controllers: [app_controller_1.AppController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map