import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { TasksModule } from '../tasks/tasks.module';
import { SseModule } from '../sse/sse.module';

@Module({
  imports: [TasksModule, SseModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
