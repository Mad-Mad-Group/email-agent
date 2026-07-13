import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Campaign, CampaignSchema } from './schemas/campaign.schema';
import { HermesService } from './hermes.service';
import { HermesController } from './hermes.controller';
import { TasksModule } from '../tasks/tasks.module';
import { SseModule } from '../sse/sse.module';
import { UsersModule } from '../users/users.module';
import { VerifiedEmailsModule } from '../verified-emails/verified-emails.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Campaign.name, schema: CampaignSchema },
    ]),
    TasksModule, // enqueue + TaskEvents
    SseModule,
    UsersModule,
    VerifiedEmailsModule, // Pool 匹配：跳過 S2
    LeadsModule,          // 更新 lead email
  ],
  controllers: [HermesController],
  providers: [HermesService],
  exports: [HermesService],
})
export class HermesModule {}
