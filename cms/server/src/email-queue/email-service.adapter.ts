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
      await this.emailService.sendMail(mail.to, mail.subject, mail.body);
      return { ok: true };
    } catch (e: any) {
      this.logger.error(`發送失敗 → ${mail.to}: ${e?.message ?? e}`);
      return { ok: false, error: e?.message ?? 'unknown' };
    }
  }
}
