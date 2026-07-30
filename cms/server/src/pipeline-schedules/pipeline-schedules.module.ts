import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PipelineSchedule, PipelineScheduleSchema } from './schemas/pipeline-schedule.schema';
import { PipelineSchedulesService } from './pipeline-schedules.service';
import { PipelineSchedulesController } from './pipeline-schedules.controller';
import { TasksModule } from '../tasks/tasks.module';
import { HermesModule } from '../hermes/hermes.module';
import { SseModule } from '../sse/sse.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PipelineSchedule.name, schema: PipelineScheduleSchema },
    ]),
    TasksModule,
    HermesModule,
    SseModule,
  ],
  controllers: [PipelineSchedulesController],
  providers: [PipelineSchedulesService],
  exports: [PipelineSchedulesService],
})
export class PipelineSchedulesModule {}
