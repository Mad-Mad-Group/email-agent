import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Lead, LeadSchema } from './schemas/lead.schema';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { SseModule } from '../sse/sse.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Lead.name, schema: LeadSchema }]),
    SseModule, // 提供 SseService 俾 LeadsService inject
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService], // Hermes / Search / Email Draft 都要用
})
export class LeadsModule {}
