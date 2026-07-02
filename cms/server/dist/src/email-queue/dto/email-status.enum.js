"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_TRANSITIONS = exports.EmailStatus = void 0;
exports.canTransition = canTransition;
exports.normalizeStatus = normalizeStatus;
var EmailStatus;
(function (EmailStatus) {
    EmailStatus["PENDING"] = "pending";
    EmailStatus["APPROVED"] = "approved";
    EmailStatus["REJECTED"] = "rejected";
    EmailStatus["SENT"] = "sent";
    EmailStatus["FAILED"] = "failed";
})(EmailStatus || (exports.EmailStatus = EmailStatus = {}));
exports.ALLOWED_TRANSITIONS = {
    [EmailStatus.PENDING]: [EmailStatus.APPROVED, EmailStatus.REJECTED],
    [EmailStatus.APPROVED]: [
        EmailStatus.SENT,
        EmailStatus.REJECTED,
        EmailStatus.PENDING,
    ],
    [EmailStatus.REJECTED]: [EmailStatus.PENDING],
    [EmailStatus.FAILED]: [EmailStatus.APPROVED, EmailStatus.PENDING],
    [EmailStatus.SENT]: [],
};
function canTransition(from, to) {
    if (from === to)
        return true;
    return exports.ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
function normalizeStatus(raw) {
    const v = (raw ?? '').toLowerCase();
    if (Object.values(EmailStatus).includes(v)) {
        return v;
    }
    return EmailStatus.PENDING;
}
//# sourceMappingURL=email-status.enum.js.map