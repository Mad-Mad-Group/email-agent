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
exports.LeadsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const crypto_1 = require("crypto");
const lead_schema_1 = require("./schemas/lead.schema");
const lead_status_enum_1 = require("./dto/lead-status.enum");
const sse_service_1 = require("../sse/sse.service");
let LeadsService = class LeadsService {
    leadModel;
    sse;
    constructor(leadModel, sse) {
        this.leadModel = leadModel;
        this.sse = sse;
    }
    async create(dto) {
        const lead = await this.leadModel.create({
            ...dto,
            status: null,
            _status: 'unverified',
        });
        this.sse?.emit(sse_service_1.SseEvent.LEAD_UPDATE, { id: lead.id, action: 'created' });
        return lead;
    }
    async findAll(q) {
        const filter = { _deleted_at: null };
        if (q.status) {
            filter.status =
                q.status === lead_status_enum_1.LeadStatus.NEW ? { $in: [null, 'new'] } : q.status;
        }
        if (q.verification)
            filter._status = q.verification;
        if (q.industry)
            filter.industry_tags = q.industry;
        if (q.source)
            filter.source = q.source;
        if (q.search) {
            const rx = new RegExp(this.escapeRegex(q.search), 'i');
            filter.$or = [{ company_name: rx }, { email: rx }];
        }
        const page = q.page ?? 1;
        const limit = q.limit ?? 20;
        const [items, total] = await Promise.all([
            this.leadModel
                .find(filter)
                .sort({ _imported_at: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
                .exec(),
            this.leadModel.countDocuments(filter).exec(),
        ]);
        return { items, total, page, limit };
    }
    async findOne(id) {
        this.assertObjectId(id);
        const lead = await this.leadModel
            .findOne({ _id: id, _deleted_at: null })
            .exec();
        if (!lead)
            throw new common_1.NotFoundException('Lead not found');
        return lead;
    }
    async update(id, dto) {
        const lead = await this.findOne(id);
        const clean = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
        Object.assign(lead, clean);
        await lead.save();
        this.sse?.emit(sse_service_1.SseEvent.LEAD_UPDATE, { id: lead.id, action: 'updated' });
        return lead;
    }
    async changeStatus(id, dto) {
        const lead = await this.findOne(id);
        const current = (0, lead_status_enum_1.normalizeStatus)(lead.status);
        if (!(0, lead_status_enum_1.canTransition)(current, dto.status)) {
            throw new common_1.BadRequestException(`Invalid status transition: ${current} → ${dto.status}`);
        }
        lead.status = (0, lead_status_enum_1.toDbStatus)(dto.status);
        if (dto.status === lead_status_enum_1.LeadStatus.CONTACTED && !lead._email_sent_at) {
            lead._email_sent_at = this.nowStamp();
            lead._email_sent = true;
        }
        await lead.save();
        this.sse?.emit(sse_service_1.SseEvent.LEAD_UPDATE, {
            id: lead.id,
            action: 'status_changed',
            status: dto.status,
        });
        return lead;
    }
    markInterested(id) {
        return this.changeStatus(id, { status: lead_status_enum_1.LeadStatus.PENDING });
    }
    async createFromSearch(data) {
        const exists = await this.leadModel
            .exists({ company_name: data.company_name, source: data.source });
        if (exists)
            return null;
        const lead = await this.leadModel.create({
            lead_id: (0, crypto_1.randomBytes)(8).toString('hex'),
            company_name: data.company_name,
            source: data.source,
            search_query: data.search_query,
            address: data.address,
            phone: data.phone,
            website: data.website,
            google_maps_url: data.google_maps_url,
            industry_tags: data.category ? [data.category] : undefined,
            status: null,
            _status: 'unverified',
            _imported_at: this.nowStamp(),
        });
        this.sse?.emit(sse_service_1.SseEvent.LEAD_UPDATE, { id: lead.id, action: 'created' });
        return lead;
    }
    async applyCollab(id, collab) {
        const lead = await this.findOne(id);
        lead._collab_primary = collab.primary;
        lead._collab_pitch = collab.pitch;
        lead._collab_reason = collab.reason;
        lead._collab_services = collab.services;
        lead._collab_generated_at = this.nowStamp();
        lead._has_analysis = true;
        lead._analyzed_at = new Date().toISOString();
        await lead.save();
        this.sse?.emit(sse_service_1.SseEvent.LEAD_UPDATE, { id: lead.id, action: 'updated' });
        return lead;
    }
    async markContactedByLeadId(leadId) {
        const lead = await this.leadModel.findOne({ lead_id: leadId }).exec();
        if (!lead)
            return;
        lead.status = (0, lead_status_enum_1.toDbStatus)(lead_status_enum_1.LeadStatus.CONTACTED);
        if (!lead._email_sent_at) {
            lead._email_sent_at = this.nowStamp();
            lead._email_sent = true;
        }
        await lead.save();
        this.sse?.emit(sse_service_1.SseEvent.LEAD_UPDATE, {
            id: lead.id,
            action: 'status_changed',
            status: lead_status_enum_1.LeadStatus.CONTACTED,
        });
    }
    async remove(id) {
        const lead = await this.findOne(id);
        lead._deleted_at = this.nowStamp();
        await lead.save();
        this.sse?.emit(sse_service_1.SseEvent.LEAD_UPDATE, { id: lead.id, action: 'deleted' });
    }
    async clearAll() {
        const res = await this.leadModel.deleteMany({}).exec();
        return res.deletedCount ?? 0;
    }
    nowStamp() {
        return new Date().toISOString().replace('T', ' ').slice(0, 19);
    }
    escapeRegex(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    assertObjectId(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid id');
        }
    }
};
exports.LeadsService = LeadsService;
exports.LeadsService = LeadsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(lead_schema_1.Lead.name)),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        sse_service_1.SseService])
], LeadsService);
//# sourceMappingURL=leads.service.js.map