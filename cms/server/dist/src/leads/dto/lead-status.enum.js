"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_TRANSITIONS = exports.LeadStatus = void 0;
exports.normalizeStatus = normalizeStatus;
exports.toDbStatus = toDbStatus;
exports.canTransition = canTransition;
var LeadStatus;
(function (LeadStatus) {
    LeadStatus["NEW"] = "new";
    LeadStatus["PENDING"] = "pending";
    LeadStatus["CONTACTED"] = "contacted";
})(LeadStatus || (exports.LeadStatus = LeadStatus = {}));
function normalizeStatus(raw) {
    if (!raw || raw === 'new')
        return LeadStatus.NEW;
    if (raw === 'pending')
        return LeadStatus.PENDING;
    if (raw === 'contacted')
        return LeadStatus.CONTACTED;
    return LeadStatus.NEW;
}
function toDbStatus(s) {
    return s === LeadStatus.NEW ? null : s;
}
exports.ALLOWED_TRANSITIONS = {
    [LeadStatus.NEW]: [LeadStatus.PENDING, LeadStatus.CONTACTED],
    [LeadStatus.PENDING]: [LeadStatus.CONTACTED, LeadStatus.NEW],
    [LeadStatus.CONTACTED]: [],
};
function canTransition(from, to) {
    if (from === to)
        return true;
    return exports.ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
//# sourceMappingURL=lead-status.enum.js.map