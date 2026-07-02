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
exports.SseController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const rxjs_1 = require("rxjs");
const sse_service_1 = require("./sse.service");
let SseController = class SseController {
    sse;
    constructor(sse) {
        this.sse = sse;
    }
    notify(body) {
        const event = body.type;
        this.sse.emit(event, body.data);
        return { ok: true };
    }
    events() {
        const hello = (0, rxjs_1.of)({ type: 'ping', data: { ts: Date.now(), msg: 'connected' } });
        const heartbeat = (0, rxjs_1.interval)(15_000).pipe((0, rxjs_1.map)(() => ({ type: 'ping', data: { ts: Date.now() } })));
        return (0, rxjs_1.merge)(hello, this.sse.asObservable(), heartbeat);
    }
};
exports.SseController = SseController;
__decorate([
    (0, common_1.Post)('sse/notify'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SseController.prototype, "notify", null);
__decorate([
    (0, common_1.Sse)('events'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", rxjs_1.Observable)
], SseController.prototype, "events", null);
exports.SseController = SseController = __decorate([
    (0, swagger_1.ApiTags)('SSE 即時事件'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [sse_service_1.SseService])
], SseController);
//# sourceMappingURL=sse.controller.js.map