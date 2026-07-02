import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [TasksModule], // enqueue S1 task
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
