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
exports.EmailQueueService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const email_queue_schema_1 = require("./schemas/email-queue.schema");
const email_status_enum_1 = require("./dto/email-status.enum");
const email_sender_interface_1 = require("./email-sender.interface");
const leads_service_1 = require("../leads/leads.service");
let EmailQueueService = class EmailQueueService {
    model;
    sender;
    leads;
    constructor(model, sender, leads) {
        this.model = model;
        this.sender = sender;
        this.leads = leads;
    }
    async findAll(q) {
        const filter = {};
        if (q.status)
            filter.status = q.status;
        if (q.search) {
            const rx = new RegExp(this.escapeRegex(q.search), 'i');
            filter.$or = [
                { company_name: rx },
                { to_email: rx },
                { subject: rx },
            ];
        }
        const page = q.page ?? 1;
        const limit = q.limit ?? 20;
        const [items, total] = await Promise.all([
            this.model
                .find(filter)
                .sort({ created_at: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
                .exec(),
            this.model.countDocuments(filter).exec(),
        ]);
        return { items, total, page, limit };
    }
    async findOne(id) {
        this.assertObjectId(id);
        const item = await this.model.findById(id).exec();
        if (!item)
            throw new common_1.NotFoundException('Email not found');
        return item;
    }
    async edit(id, dto) {
        const item = await this.findOne(id);
        const status = (0, email_status_enum_1.normalizeStatus)(item.status);
        if (status !== email_status_enum_1.EmailStatus.PENDING && status !== email_status_enum_1.EmailStatus.APPROVED) {
            throw new common_1.BadRequestException(`唔可以喺 ${status} 狀態編輯`);
        }
        if (dto.subject !== undefined)
            item.subject = dto.subject;
        if (dto.body !== undefined)
            item.body = dto.body;
        await item.save();
        return item;
    }
    approve(id) {
        return this.transition(id, email_status_enum_1.EmailStatus.APPROVED);
    }
    async reject(id, dto) {
        const item = await this.transition(id, email_status_enum_1.EmailStatus.REJECTED);
        if (dto.reason)
            item.error = { rejected_reason: dto.reason };
        await item.save();
        return item;
    }
    async send(id) {
        const item = await this.findOne(id);
        const status = (0, email_status_enum_1.normalizeStatus)(item.status);
        if (!(0, email_status_enum_1.canTransition)(status, email_status_enum_1.EmailStatus.SENT)) {
            throw new common_1.BadRequestException(`${status} 唔可以直接發送（要先 approve）`);
        }
        if (!item.to_email)
            throw new common_1.BadRequestException('冇收件人 to_email');
        const result = await this.sender.send({
            to: item.to_email,
            subject: item.subject ?? '',
            body: item.body ?? '',
        });
        if (!result.ok) {
            item.status = email_status_enum_1.EmailStatus.FAILED;
            item.error = { send_error: result.error ?? 'unknown' };
            await item.save();
            throw new common_1.BadRequestException(`發送失敗：${result.error ?? 'unknown'}`);
        }
        item.status = email_status_enum_1.EmailStatus.SENT;
        item.sent_at = this.nowStamp();
        item.error = null;
        await item.save();
        if (item.lead_id && this.leads) {
            await this.leads.markContactedByLeadId(item.lead_id);
        }
        return item;
    }
    async transition(id, to) {
        const item = await this.findOne(id);
        const from = (0, email_status_enum_1.normalizeStatus)(item.status);
        if (!(0, email_status_enum_1.canTransition)(from, to)) {
            throw new common_1.BadRequestException(`Invalid transition: ${from} → ${to}`);
        }
        item.status = to;
        await item.save();
        return item;
    }
    nowStamp() {
        return new Date().toISOString().replace('T', ' ').slice(0, 19);
    }
    escapeRegex(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    assertObjectId(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            throw new common_1.BadRequestException('Invalid id');
    }
};
exports.EmailQueueService = EmailQueueService;
exports.EmailQueueService = EmailQueueService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(email_queue_schema_1.EmailQueueItem.name)),
    __param(1, (0, common_1.Inject)(email_sender_interface_1.EMAIL_SENDER)),
    __param(2, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [mongoose_2.Model, Object, leads_service_1.LeadsService])
], EmailQueueService);
//# sourceMappingURL=email-queue.service.js.map