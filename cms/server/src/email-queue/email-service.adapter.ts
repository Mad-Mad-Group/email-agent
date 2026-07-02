import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { EmailSender, SendMail } from './email-sender.interface';

/**
 * 將 Person B 嘅 EmailService（SMTP nodemailer）
 * 適配成 Person C 嘅 EmailSender interface。
 */
@Injectable()
export class EmailServiceAdapter implements EmailSender {
  private readonly logger = new Logger(EmailServiceAdapter.name);

  constructor(private readonly emailService: EmailService) {}

  async send(mail: SendMail): Promise<{ ok: boolean; error?: string }> {
    try {
      // body 可能係純文字（有換行但冇 HTML tag），包 pre-wrap div 保留格式
      const html = `<div style="white-space:pre-wrap;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;font-size:14px;color:#1a1a1a">${mail.body}</div>`;
      await this.emailService.sendMail(mail.to, mail.subject, html);
      return { ok: true };
    } catch (e: any) {
      this.logger.error(`發送失敗 → ${mail.to}: ${e?.message ?? e}`);
      return { ok: false, error: e?.message ?? 'unknown' };
    }
  }
}
