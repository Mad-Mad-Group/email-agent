import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailService } from './email.service';
import { UserCredentialsModule } from '../user-credentials/user-credentials.module';
import { User, UserSchema } from '../users/schemas/user.schema';

@Global()
@Module({
  imports: [
    UserCredentialsModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
