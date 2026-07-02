import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host) {
      this.logger.warn('SMTP_HOST is not configured. Email sending will be skipped.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    this.isConfigured = true;
    this.logger.log('Email transporter configured successfully.');
  }

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn('SMTP is not configured. Skipping email send.');
      return;
    }

    const from = this.configService.get<string>('SMTP_FROM');

    await this.transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
  }
}
