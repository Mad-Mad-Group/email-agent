import { Injectable, Logger, OnModuleInit, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { UserCredentialsService } from '../user-credentials/user-credentials.service';
import { User, UserDocument } from '../users/schemas/user.schema';

/**
 * EmailService — 三條路徑（優先順序）:
 *
 * 1. Per-user SMTP（user.smtpHost 有值）→ 用 user 自己嘅 SMTP 設定
 * 2. Per-user OAuth（user_credentials 有 refresh token）→ 用 XOAUTH2
 * 3. Shared .env fallback → 用 server-wide SMTP_HOST/SMTP_USER/SMTP_PASS
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
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
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
      `Email shared-SMTP fallback configured (host=${host}, user=${user ?? 'n/a'}).`,
    );
  }

  /* ── Per-user SMTP transport（on-demand, 唔 cache） ── */

  private createUserTransport(smtp: {
    smtpHost: string; smtpPort: number;
    smtpUser: string; smtpPass: string;
  }): Transporter {
    return nodemailer.createTransport({
      host: smtp.smtpHost,
      port: smtp.smtpPort,
      secure: smtp.smtpPort === 465,
      auth: { user: smtp.smtpUser, pass: smtp.smtpPass },
    });
  }

  private async getUserSmtp(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('smtpHost smtpPort smtpUser smtpPass smtpFrom')
      .lean()
      .exec();
    if (!user) return null;
    const u = user as any;
    if (!u.smtpHost || !u.smtpUser || !u.smtpPass) return null;
    return {
      smtpHost: u.smtpHost as string,
      smtpPort: (u.smtpPort ?? 587) as number,
      smtpUser: u.smtpUser as string,
      smtpPass: u.smtpPass as string,
      smtpFrom: (u.smtpFrom || u.smtpUser) as string,
    };
  }

  /**
   * 智能發送：user SMTP → OAuth → .env fallback
   * 如果傳入 userId，會先嘗試 user 自己嘅設定
   */
  async smartSend(args: {
    user_id?: string;
    to: string;
    subject: string;
    html: string;
  }): Promise<nodemailer.SentMessageInfo | void> {
    const { user_id, to, subject, html } = args;

    // 1) 嘗試 per-user SMTP
    if (user_id) {
      const smtp = await this.getUserSmtp(user_id);
      if (smtp) {
        const t = this.createUserTransport(smtp);
        const info = await t.sendMail({ from: smtp.smtpFrom, to, subject, html });
        this.logger.log(`mail sent via user-SMTP user=${user_id} to=${to} msgId=${info.messageId}`);
        return info;
      }

      // 2) 嘗試 OAuth
      try {
        const hasOAuth = await this.userCredentials.findActive(user_id);
        if (hasOAuth) {
          const info = await this.userCredentials.sendMailAsUser(user_id, { to, subject, html });
          this.logger.log(`mail sent via OAuth user=${user_id} to=${to} msgId=${info.messageId}`);
          return info;
        }
      } catch (e: any) {
        this.logger.warn(`OAuth send failed for user=${user_id}: ${e?.message}`);
      }
    }

    // 3) .env shared fallback
    return this.sendMail(to, subject, html);
  }

  /** 舊 server-wide send（.env SMTP）。仍保留作 fallback + system mail。 */
  async sendMail(to: string, subject: string, html: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`Shared SMTP not configured. Skip mail to ${to}.`);
      return;
    }
    const from = this.configService.get<string>('SMTP_FROM');
    await this.transporter.sendMail({ from, to, subject, html });
  }

  /** Per-user send (OAuth2 XOAUTH2)。保留向後相容。 */
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

  /** Per-user IMAP client。doReplyCheck 用呢個嚟 scan user 自己個 inbox。 */
  async getImapClientForUser(user_id: string) {
    return this.userCredentials.imapClientForUser(user_id);
  }

  /**
   * 測試 per-user SMTP + IMAP 連線。
   * SMTP: verify() + 發一封測試 email 到自己地址。
   * IMAP: 連接 + login + disconnect。
   */
  async testConnection(userId: string): Promise<{
    smtp: 'ok' | 'fail';
    imap: 'ok' | 'fail' | 'skip';
    smtpError?: string;
    imapError?: string;
  }> {
    const result: { smtp: 'ok' | 'fail'; imap: 'ok' | 'fail' | 'skip'; smtpError?: string; imapError?: string } = {
      smtp: 'fail',
      imap: 'skip',
    };

    const smtp = await this.getUserSmtp(userId);
    if (!smtp) {
      result.smtpError = 'SMTP not configured';
      return result;
    }

    // Test SMTP (15s timeout)
    try {
      const t = this.createUserTransport(smtp);
      (t as any).options.connectionTimeout = 10000;
      (t as any).options.greetingTimeout = 10000;
      await t.verify();
      await t.sendMail({
        from: smtp.smtpFrom,
        to: smtp.smtpUser,
        subject: '[ClientRadar] SMTP Test — 測試郵件',
        html: '<p>This is a test email from ClientRadar AI to verify your SMTP settings.<br/>這是一封來自 ClientRadar AI 的測試郵件，用於驗證你的 SMTP 設定。</p>',
      });
      result.smtp = 'ok';
    } catch (e: any) {
      result.smtpError = e?.message || 'SMTP connection failed';
    }

    // Test IMAP (15s timeout)
    const user = await this.userModel
      .findById(userId)
      .select('imapHost imapPort smtpUser smtpPass')
      .lean()
      .exec();
    const u = user as any;
    if (u?.imapHost) {
      try {
        const { ImapFlow } = await import('imapflow');
        const imapClient = new ImapFlow({
          host: u.imapHost,
          port: u.imapPort ?? 993,
          secure: true,
          auth: { user: u.smtpUser, pass: u.smtpPass },
          logger: false as any,
          connectionTimeout: 15000,
        });
        await imapClient.connect();
        await imapClient.logout();
        result.imap = 'ok';
      } catch (e: any) {
        result.imap = 'fail';
        result.imapError = e?.message || 'IMAP connection failed';
      }
    }

    return result;
  }
}
