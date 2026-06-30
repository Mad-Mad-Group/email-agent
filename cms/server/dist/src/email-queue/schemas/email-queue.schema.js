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
exports.EmailQueueSchema = exports.EmailQueueItem = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const email_status_enum_1 = require("../dto/email-status.enum");
let EmailQueueItem = class EmailQueueItem {
    email_id;
    lead_id;
    user_id;
    company_name;
    to_email;
    subject;
    body;
    status;
    created_at;
    sent_at;
    error;
};
exports.EmailQueueItem = EmailQueueItem;
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], EmailQueueItem.prototype, "email_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], EmailQueueItem.prototype, "lead_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], EmailQueueItem.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmailQueueItem.prototype, "company_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmailQueueItem.prototype, "to_email", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmailQueueItem.prototype, "subject", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmailQueueItem.prototype, "body", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: email_status_enum_1.EmailStatus.PENDING, index: true }),
    __metadata("design:type", String)
], EmailQueueItem.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], EmailQueueItem.prototype, "created_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], EmailQueueItem.prototype, "sent_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: null }),
    __metadata("design:type", Object)
], EmailQueueItem.prototype, "error", void 0);
exports.EmailQueueItem = EmailQueueItem = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'email_queue',
        strict: false,
        minimize: false,
        versionKey: false,
    })
], EmailQueueItem);
exports.EmailQueueSchema = mongoose_1.SchemaFactory.createForClass(EmailQueueItem);
exports.EmailQueueSchema.index({ status: 1, created_at: -1 });
//# sourceMappingURL=email-queue.schema.js.map