"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HermesModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const campaign_schema_1 = require("./schemas/campaign.schema");
const hermes_service_1 = require("./hermes.service");
const hermes_controller_1 = require("./hermes.controller");
const tasks_module_1 = require("../tasks/tasks.module");
const sse_module_1 = require("../sse/sse.module");
const users_module_1 = require("../users/users.module");
let HermesModule = class HermesModule {
};
exports.HermesModule = HermesModule;
exports.HermesModule = HermesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: campaign_schema_1.Campaign.name, schema: campaign_schema_1.CampaignSchema },
            ]),
            tasks_module_1.TasksModule,
            sse_module_1.SseModule,
            users_module_1.UsersModule,
        ],
        controllers: [hermes_controller_1.HermesController],
        providers: [hermes_service_1.HermesService],
        exports: [hermes_service_1.HermesService],
    })
], HermesModule);
//# sourceMappingURL=hermes.module.js.map