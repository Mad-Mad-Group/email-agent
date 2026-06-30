import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [MulterModule.register()],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
