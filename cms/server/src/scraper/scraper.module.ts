import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { LeadsModule } from '../leads/leads.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [LeadsModule, TasksModule],
  controllers: [ScraperController],
  providers: [ScraperService],
  exports: [ScraperService],
})
export class ScraperModule {}
