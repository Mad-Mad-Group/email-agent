import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserCredential, UserCredentialSchema } from './schemas/user-credential.schema';
import { UserCredentialsService } from './user-credentials.service';
import { UserCredentialsController } from './user-credentials.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserCredential.name, schema: UserCredentialSchema },
    ]),
  ],
  controllers: [UserCredentialsController],
  providers: [UserCredentialsService],
  exports: [UserCredentialsService],
})
export class UserCredentialsModule {}
