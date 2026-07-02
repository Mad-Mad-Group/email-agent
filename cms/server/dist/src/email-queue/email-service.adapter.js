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
var EmailServiceAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailServiceAdapter = void 0;
const common_1 = require("@nestjs/common");
const email_service_1 = require("../email/email.service");
let EmailServiceAdapter = EmailServiceAdapter_1 = class EmailServiceAdapter {
    emailService;
    logger = new common_1.Logger(EmailServiceAdapter_1.name);
    constructor(emailService) {
        this.emailService = emailService;
    }
    async send(mail) {
        try {
            const html = `<div style="white-space:pre-wrap;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;font-size:14px;color:#1a1a1a">${mail.body}</div>`;
            await this.emailService.sendMail(mail.to, mail.subject, html);
            return { ok: true };
        }
        catch (e) {
            this.logger.error(`發送失敗 → ${mail.to}: ${e?.message ?? e}`);
            return { ok: false, error: e?.message ?? 'unknown' };
        }
    }
};
exports.EmailServiceAdapter = EmailServiceAdapter;
exports.EmailServiceAdapter = EmailServiceAdapter = EmailServiceAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [email_service_1.EmailService])
], EmailServiceAdapter);
//# sourceMappingURL=email-service.adapter.js.map