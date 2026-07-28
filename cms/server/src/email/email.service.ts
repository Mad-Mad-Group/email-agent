import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { UserCredentialsService } from '../user-credentials/user-credentials.service';

/**
 * EmailService — 兩條路徑:
 *
 * 1. 舊 sendMail (server-wide) — 用 .env 嘅 SMTP_USER/SMTP_PASS,server-wide shared sender。
 *    保留作為 backward-compat + org-wide mass-mailing (eg announcement)。
 *
 * 2. 新 sendMailAsUser (per-user) — 用 UserCredentialsService 喺 user_credentials collection
 *    拎 OAuth refresh token,換 xoauth2 access token,用 user 嘅 Gmail 自己寄。
 *    切換由 worker caller (doSend) 透過 PER_USER_SMTP=true env flag 決定
 *    (見 cms/worker/agent.ts)。
 *
 * 而家 .env 仍然有 SMTP_* 用嚟做 fallback / not-yet-linked users。User 一連了 Gmail 就
 * 自動 route 去 per-user path, .env 嘅 SMTP 留作舊 user / 沒連 Gmail user 嘅 fallback。
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private isConfigured = false;

  constructor(
    private readonly configService: ConfigService,
    @Inject(UserCredentialsService)
    private readonly userCredentials: UserCredentialsService,
  ) {}

  onModuleInit() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host) {
      this.logger.warn('SMTP_HOST is not configured. Shared SMTP fallback will be skipped.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(port) || 587,
      secure: Number(port) === 465,
      auth: { user, pass },
    });

    this.isConfigured = true;
    this.logger.log(
      `Email shared-SMTP fallback configured (host=${host}, user=${user ?? 'n/a'}). ` +
        'Per-user SMTP active when user has connected Gmail.',
    );
  }

  /** 舊 server-wide send。Per-user 模式啟用時唔應該 call 這個。 */
  async sendMail(to: string, subject: string, html: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`Shared SMTP not configured. Skip mail to ${to}.`);
      return;
    }
    const from = this.configService.get<string>('SMTP_FROM');
    await this.transporter.sendMail({ from, to, subject, html });
  }

  /** Per-user send (OAuth2 XOAUTH2)。Caller 必須係 userId 對應登入 user。 */
  async sendMailAsUser(args: {
    user_id: string;
    to: string;
    subject: string;
    html: string;
  }): Promise<nodemailer.SentMessageInfo> {
    const info = await this.userCredentials.sendMailAsUser(args.user_id, {
      to: args.to,
      subject: args.subject,
      html: args.html,
    });
    this.logger.log(
      `mail sent as user=${args.user_id} to=${args.to} msgId=${info.messageId}`,
    );
    return info;
  }

  /**
   * Per-user IMAP client。doReplyCheck 用呢個嚟 scan user 自己個 inbox。
   */
  async getImapClientForUser(user_id: string) {
    return this.userCredentials.imapClientForUser(user_id);
  }
}
