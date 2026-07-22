import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VerifiedEmail, VerifiedEmailSchema } from './schemas/verified-email.schema';
import { VerifiedEmailsService } from './verified-emails.service';
import { VerifiedEmailsController } from './verified-emails.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VerifiedEmail.name, schema: VerifiedEmailSchema },
    ]),
  ],
  providers: [VerifiedEmailsService],
  controllers: [VerifiedEmailsController],
  exports: [VerifiedEmailsService],
})
export class VerifiedEmailsModule {}
