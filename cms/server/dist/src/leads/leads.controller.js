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
exports.LeadsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const leads_service_1 = require("./leads.service");
const create_lead_dto_1 = require("./dto/create-lead.dto");
const update_lead_dto_1 = require("./dto/update-lead.dto");
const list_leads_query_dto_1 = require("./dto/list-leads-query.dto");
const update_lead_status_dto_1 = require("./dto/update-lead-status.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const permission_decorator_1 = require("../common/decorators/permission.decorator");
let LeadsController = class LeadsController {
    leads;
    constructor(leads) {
        this.leads = leads;
    }
    async list(query) {
        return this.leads.findAll(query);
    }
    async get(id) {
        return this.leads.findOne(id);
    }
    async create(dto) {
        return this.leads.create(dto);
    }
    async update(id, dto) {
        return this.leads.update(id, dto);
    }
    async changeStatus(id, dto) {
        return this.leads.changeStatus(id, dto);
    }
    async markInterested(id) {
        return this.leads.markInterested(id);
    }
    async remove(id) {
        await this.leads.remove(id);
        return { id };
    }
    async clearAll() {
        const count = await this.leads.clearAll();
        return { deleted: count };
    }
};
exports.LeadsController = LeadsController;
__decorate([
    (0, common_1.Get)(),
    (0, permission_decorator_1.Permission)('leads.view'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_leads_query_dto_1.ListLeadsQueryDto]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permission_decorator_1.Permission)('leads.view'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(),
    (0, permission_decorator_1.Permission)('leads.create'),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_lead_dto_1.CreateLeadDto]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permission_decorator_1.Permission)('leads.update'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_lead_dto_1.UpdateLeadDto]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, permission_decorator_1.Permission)('leads.update'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_lead_status_dto_1.UpdateLeadStatusDto]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "changeStatus", null);
__decorate([
    (0, common_1.Post)(':id/mark-interested'),
    (0, permission_decorator_1.Permission)('leads.update'),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "markInterested", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(200),
    (0, permission_decorator_1.Permission)('leads.delete'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "remove", null);
__decorate([
    (0, common_1.Delete)(),
    (0, common_1.HttpCode)(200),
    (0, permission_decorator_1.Permission)('leads.delete'),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "clearAll", null);
exports.LeadsController = LeadsController = __decorate([
    (0, swagger_1.ApiTags)('Leads 搵客管理'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('leads'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [leads_service_1.LeadsService])
], LeadsController);
//# sourceMappingURL=leads.controller.js.map