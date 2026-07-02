import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { SettingsModule } from './settings/settings.module';
import { UploadsModule } from './uploads/uploads.module';
import { EmailModule } from './email/email.module';
import { SseModule } from './sse/sse.module';
import { LeadsModule } from './leads/leads.module';
import { TasksModule } from './tasks/tasks.module';
import { SearchModule } from './search/search.module';
import { ScraperModule } from './scraper/scraper.module';
import { AiAnalysisModule } from './ai/ai-analysis.module';
import { EmailQueueModule } from './email-queue/email-queue.module';
import { HermesModule } from './hermes/hermes.module';
import { JobsModule } from './jobs/jobs.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    // Config — load .env
    ConfigModule.forRoot({ isGlobal: true }),

    // MongoDB
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://leadteam:leadteam2026@localhost:27017/lead_scraper'),

    // Scheduled jobs
    ScheduleModule.forRoot(),

    // Core modules (Person B)
    AuthModule,
    UsersModule,
    RolesModule,
    SettingsModule,
    UploadsModule,
    EmailModule,

    // Business modules (Person C)
    SseModule,
    LeadsModule,
    TasksModule,
    SearchModule,
    ScraperModule,
    AiAnalysisModule,
    EmailQueueModule,
    HermesModule,
    JobsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
