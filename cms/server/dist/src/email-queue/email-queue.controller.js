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
exports.EmailQueueController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const email_queue_service_1 = require("./email-queue.service");
const list_email_queue_query_dto_1 = require("./dto/list-email-queue-query.dto");
const edit_email_dto_1 = require("./dto/edit-email.dto");
const reject_email_dto_1 = require("./dto/reject-email.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const permission_decorator_1 = require("../common/decorators/permission.decorator");
let EmailQueueController = class EmailQueueController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async list(q) {
        return this.svc.findAll(q);
    }
    async get(id) {
        return this.svc.findOne(id);
    }
    async edit(id, dto) {
        return this.svc.edit(id, dto);
    }
    async approve(id) {
        return this.svc.approve(id);
    }
    async reject(id, dto) {
        return this.svc.reject(id, dto);
    }
    async send(id) {
        return this.svc.send(id);
    }
};
exports.EmailQueueController = EmailQueueController;
__decorate([
    (0, common_1.Get)(),
    (0, permission_decorator_1.Permission)('emails.view'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_email_queue_query_dto_1.ListEmailQueueQueryDto]),
    __metadata("design:returntype", Promise)
], EmailQueueController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permission_decorator_1.Permission)('emails.view'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmailQueueController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permission_decorator_1.Permission)('emails.edit'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, edit_email_dto_1.EditEmailDto]),
    __metadata("design:returntype", Promise)
], EmailQueueController.prototype, "edit", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, common_1.HttpCode)(200),
    (0, permission_decorator_1.Permission)('emails.approve'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmailQueueController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, common_1.HttpCode)(200),
    (0, permission_decorator_1.Permission)('emails.approve'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, reject_email_dto_1.RejectEmailDto]),
    __metadata("design:returntype", Promise)
], EmailQueueController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':id/send'),
    (0, common_1.HttpCode)(200),
    (0, permission_decorator_1.Permission)('emails.send'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmailQueueController.prototype, "send", null);
exports.EmailQueueController = EmailQueueController = __decorate([
    (0, swagger_1.ApiTags)('Email Queue 郵件審批'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('email-queue'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [email_queue_service_1.EmailQueueService])
], EmailQueueController);
//# sourceMappingURL=email-queue.controller.js.map