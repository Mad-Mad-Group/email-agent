"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailQueueModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const email_queue_schema_1 = require("./schemas/email-queue.schema");
const email_queue_service_1 = require("./email-queue.service");
const email_queue_controller_1 = require("./email-queue.controller");
const email_sender_interface_1 = require("./email-sender.interface");
const email_service_adapter_1 = require("./email-service.adapter");
const leads_module_1 = require("../leads/leads.module");
let EmailQueueModule = class EmailQueueModule {
};
exports.EmailQueueModule = EmailQueueModule;
exports.EmailQueueModule = EmailQueueModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: email_queue_schema_1.EmailQueueItem.name, schema: email_queue_schema_1.EmailQueueSchema },
            ]),
            leads_module_1.LeadsModule,
        ],
        controllers: [email_queue_controller_1.EmailQueueController],
        providers: [
            email_queue_service_1.EmailQueueService,
            { provide: email_sender_interface_1.EMAIL_SENDER, useClass: email_service_adapter_1.EmailServiceAdapter },
        ],
        exports: [email_queue_service_1.EmailQueueService],
    })
], EmailQueueModule);
//# sourceMappingURL=email-queue.module.js.map