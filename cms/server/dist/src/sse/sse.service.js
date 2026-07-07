"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SseService = exports.SseEvent = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
var SseEvent;
(function (SseEvent) {
    SseEvent["LEAD_UPDATE"] = "lead_update";
    SseEvent["EMAIL_UPDATE"] = "email_update";
    SseEvent["NOTIFICATION"] = "notification";
    SseEvent["TASK_UPDATE"] = "task_update";
    SseEvent["HERMES_LOG"] = "hermes_log";
    SseEvent["PIPELINE_PROGRESS"] = "pipeline_progress";
})(SseEvent || (exports.SseEvent = SseEvent = {}));
let SseService = class SseService {
    stream$ = new rxjs_1.Subject();
    emit(event, data) {
        this.stream$.next({ type: event, data: data });
    }
    asObservable() {
        return this.stream$.asObservable();
    }
};
exports.SseService = SseService;
exports.SseService = SseService = __decorate([
    (0, common_1.Injectable)()
], SseService);
//# sourceMappingURL=sse.service.js.map