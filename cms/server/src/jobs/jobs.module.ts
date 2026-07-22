import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { TasksModule } from '../tasks/tasks.module';
import { SseModule } from '../sse/sse.module';
import { Lead, LeadSchema } from '../leads/schemas/lead.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Lead.name, schema: LeadSchema }]),
    TasksModule,
    SseModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
