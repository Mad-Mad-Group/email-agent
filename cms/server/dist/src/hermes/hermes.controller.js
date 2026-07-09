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
exports.HermesController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const hermes_service_1 = require("./hermes.service");
const run_hermes_dto_1 = require("./dto/run-hermes.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let HermesController = class HermesController {
    hermes;
    constructor(hermes) {
        this.hermes = hermes;
    }
    async run(dto, user) {
        return this.hermes.run(dto, user.userId);
    }
    async campaign(id) {
        return this.hermes.getCampaign(id);
    }
};
exports.HermesController = HermesController;
__decorate([
    (0, common_1.Post)('run'),
    (0, common_1.HttpCode)(200),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [run_hermes_dto_1.RunHermesDto, Object]),
    __metadata("design:returntype", Promise)
], HermesController.prototype, "run", null);
__decorate([
    (0, common_1.Get)('campaigns/:id'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HermesController.prototype, "campaign", null);
exports.HermesController = HermesController = __decorate([
    (0, swagger_1.ApiTags)('Hermes Pipeline 指揮'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('hermes'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [hermes_service_1.HermesService])
], HermesController);
//# sourceMappingURL=hermes.controller.js.map