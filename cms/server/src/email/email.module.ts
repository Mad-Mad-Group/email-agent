import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { UserCredentialsModule } from '../user-credentials/user-credentials.module';

@Global()
@Module({
  imports: [UserCredentialsModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
