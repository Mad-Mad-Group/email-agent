/**
 * Email 發送介面 —— B 嘅 EmailService（SMTP）會實作呢個。
 * 而家用 FakeEmailSender 頂住（只 log，唔真發），B 交付後喺 module 換 useClass 即可。
 */
export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export interface SendMail {
  to: string;
  subject: string;
  body: string;
}

export interface EmailSender {
  send(mail: SendMail): Promise<{ ok: boolean; error?: string }>;
}

/** 臨時假發送器：唔真發，只回 ok。等 B 嘅 EmailService 換走。 */
export class FakeEmailSender implements EmailSender {
  async send(mail: SendMail): Promise<{ ok: boolean; error?: string }> {
    // eslint-disable-next-line no-console
    console.log(`[FakeEmailSender] (假裝)發送 → ${mail.to} | ${mail.subject}`);
    return { ok: true };
  }
}
