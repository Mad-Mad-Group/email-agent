import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TokenUsage, TokenUsageSchema } from './schemas/token-usage.schema';
import { TokenUsageService } from './token-usage.service';
import { TokenUsageController } from './token-usage.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TokenUsage.name, schema: TokenUsageSchema }]),
  ],
  providers: [TokenUsageService],
  controllers: [TokenUsageController],
  exports: [TokenUsageService],
})
export class TokenUsageModule {}
