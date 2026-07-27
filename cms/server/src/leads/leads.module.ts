import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Lead, LeadSchema } from './schemas/lead.schema';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { SseModule } from '../sse/sse.module';
import { TasksModule } from '../tasks/tasks.module';
import { EmailQueueItem, EmailQueueSchema } from '../email-queue/schemas/email-queue.schema';
import { Analysis, AnalysisSchema } from '../ai/schemas/analysis.schema';
import { CalendarEvent, CalendarEventSchema } from '../calendar/schemas/calendar-event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: EmailQueueItem.name, schema: EmailQueueSchema },
      { name: Analysis.name, schema: AnalysisSchema },
      { name: CalendarEvent.name, schema: CalendarEventSchema },
    ]),
    SseModule,
    TasksModule,
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
