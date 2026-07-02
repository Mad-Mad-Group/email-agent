import { Module } from '@nestjs/common';
import { SseService } from './sse.service';
import { SseController } from './sse.controller';

@Module({
  controllers: [SseController],
  providers: [SseService],
  exports: [SseService], // Leads / Hermes / Email Draft 都 inject 呢個
})
export class SseModule {}
