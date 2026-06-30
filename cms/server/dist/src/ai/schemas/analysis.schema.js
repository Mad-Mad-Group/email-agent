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
exports.AnalysisSchema = exports.Analysis = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Analysis = class Analysis {
    lead_id;
    analysis_type;
    ai_summary;
    all_text;
    website_title;
    emails_found;
    phones_found;
    _analyzed_at;
    _summary_at;
};
exports.Analysis = Analysis;
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], Analysis.prototype, "lead_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Analysis.prototype, "analysis_type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Analysis.prototype, "ai_summary", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Analysis.prototype, "all_text", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Analysis.prototype, "website_title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: undefined }),
    __metadata("design:type", Array)
], Analysis.prototype, "emails_found", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: undefined }),
    __metadata("design:type", Array)
], Analysis.prototype, "phones_found", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], Analysis.prototype, "_analyzed_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], Analysis.prototype, "_summary_at", void 0);
exports.Analysis = Analysis = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'analyses',
        strict: false,
        minimize: false,
        versionKey: false,
    })
], Analysis);
exports.AnalysisSchema = mongoose_1.SchemaFactory.createForClass(Analysis);
//# sourceMappingURL=analysis.schema.js.map