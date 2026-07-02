"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeEmailSender = exports.EMAIL_SENDER = void 0;
exports.EMAIL_SENDER = Symbol('EMAIL_SENDER');
class FakeEmailSender {
    async send(mail) {
        console.log(`[FakeEmailSender] (假裝)發送 → ${mail.to} | ${mail.subject}`);
        return { ok: true };
    }
}
exports.FakeEmailSender = FakeEmailSender;
//# sourceMappingURL=email-sender.interface.js.map