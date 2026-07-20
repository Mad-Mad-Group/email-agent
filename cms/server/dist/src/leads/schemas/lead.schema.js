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
exports.LeadSchema = exports.Lead = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Lead = class Lead {
    lead_id;
    user_id;
    company_name;
    industry_tags;
    source;
    google_maps_url;
    search_query;
    email;
    extra_emails;
    phone;
    extra_phones;
    website;
    address;
    social_media;
    rating;
    website_description;
    _website_description;
    _website_services;
    _website_researched;
    status;
    _email_sent;
    _email_sent_at;
    _no_reply;
    _followup_count;
    _followup_draft;
    _status;
    _has_analysis;
    _has_email_draft;
    _has_wa_message;
    email_draft;
    _email_draft_score;
    _email_draft_score_reason;
    _email_draft_scored_at;
    _collab_primary;
    _collab_pitch;
    _collab_reason;
    _collab_services;
    _collab_generated_at;
    _wa_link;
    _wa_message;
    _imported_at;
    _cleaned_at;
    _analyzed_at;
    _deleted_at;
};
exports.Lead = Lead;
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], Lead.prototype, "lead_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], Lead.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, index: true }),
    __metadata("design:type", String)
], Lead.prototype, "company_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: undefined }),
    __metadata("design:type", Array)
], Lead.prototype, "industry_tags", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], Lead.prototype, "source", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Lead.prototype, "google_maps_url", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Lead.prototype, "search_query", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true, index: true }),
    __metadata("design:type", String)
], Lead.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: undefined }),
    __metadata("design:type", Array)
], Lead.prototype, "extra_emails", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Lead.prototype, "phone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: undefined }),
    __metadata("design:type", Array)
], Lead.prototype, "extra_phones", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Lead.prototype, "website", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Lead.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Lead.prototype, "social_media", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], Lead.prototype, "rating", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Lead.prototype, "website_description", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Lead.prototype, "_website_description", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Lead.prototype, "_website_services", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean }),
    __metadata("design:type", Boolean)
], Lead.prototype, "_website_researched", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, index: true }),
    __metadata("design:type", Object)
], Lead.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean }),
    __metadata("design:type", Boolean)
], Lead.prototype, "_email_sent", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], Lead.prototype, "_email_sent_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean }),
    __metadata("design:type", Boolean)
], Lead.prototype, "_no_reply", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number }),
    __metadata("design:type", Number)
], Lead.prototype, "_followup_count", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Lead.prototype, "_followup_draft", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: 'unverified', index: true }),
    __metadata("design:type", String)
], Lead.prototype, "_status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean }),
    __metadata("design:type", Boolean)
], Lead.prototype, "_has_analysis", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean }),
    __metadata("design:type", Boolean)
], Lead.prototype, "_has_email_draft", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean }),
    __metadata("design:type", Boolean)
], Lead.prototype, "_has_wa_message", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Lead.prototype, "email_draft", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number }),
    __metadata("design:type", Number)
], Lead.prototype, "_email_draft_score", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], Lead.prototype, "_email_draft_score_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], Lead.prototype, "_email_draft_scored_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Lead.prototype, "_collab_primary", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Lead.prototype, "_collab_pitch", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Lead.prototype, "_collab_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: undefined }),
    __metadata("design:type", Array)
], Lead.prototype, "_collab_services", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], Lead.prototype, "_collab_generated_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Lead.prototype, "_wa_link", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Lead.prototype, "_wa_message", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], Lead.prototype, "_imported_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], Lead.prototype, "_cleaned_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], Lead.prototype, "_analyzed_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, index: true }),
    __metadata("design:type", Object)
], Lead.prototype, "_deleted_at", void 0);
exports.Lead = Lead = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'leads',
        strict: false,
        minimize: false,
        versionKey: false,
    })
], Lead);
exports.LeadSchema = mongoose_1.SchemaFactory.createForClass(Lead);
exports.LeadSchema.index({ _deleted_at: 1, status: 1 });
//# sourceMappingURL=lead.schema.js.map