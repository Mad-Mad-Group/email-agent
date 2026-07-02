"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SKILL = exports.TaskStatus = void 0;
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "pending";
    TaskStatus["RUNNING"] = "running";
    TaskStatus["COMPLETED"] = "completed";
    TaskStatus["FAILED"] = "failed";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
exports.SKILL = {
    SEARCH: 'S1',
    ANALYZE: 'S2',
    EMAIL_DRAFT: 'S3',
    EMAIL_SEND: 'S4',
};
//# sourceMappingURL=task-status.enum.js.map