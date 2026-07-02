import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  EmailQueueItem,
  EmailQueueSchema,
} from './schemas/email-queue.schema';
import { EmailQueueService } from './email-queue.service';
import { EmailQueueController } from './email-queue.controller';
import { EMAIL_SENDER } from './email-sender.interface';
import { EmailServiceAdapter } from './email-service.adapter';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmailQueueItem.name, schema: EmailQueueSchema },
    ]),
    LeadsModule, // 提供 LeadsService（發送後標 lead = contacted）
  ],
  controllers: [EmailQueueController],
  providers: [
    EmailQueueService,
    // 用真正嘅 EmailService（SMTP）替代 FakeEmailSender
    { provide: EMAIL_SENDER, useClass: EmailServiceAdapter },
  ],
  exports: [EmailQueueService],
})
export class EmailQueueModule {}
