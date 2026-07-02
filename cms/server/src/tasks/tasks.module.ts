import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './schemas/task.schema';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TaskEvents } from './task-events';
import { SseModule } from '../sse/sse.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    SseModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskEvents],
  exports: [TasksService, TaskEvents], // Search / AI / Email / Hermes 都用
})
export class TasksModule {}
