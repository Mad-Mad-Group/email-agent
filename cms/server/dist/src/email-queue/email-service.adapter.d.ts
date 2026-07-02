import { EmailService } from '../email/email.service';
import { EmailSender, SendMail } from './email-sender.interface';
export declare class EmailServiceAdapter implements EmailSender {
    private readonly emailService;
    private readonly logger;
    constructor(emailService: EmailService);
    send(mail: SendMail): Promise<{
        ok: boolean;
        error?: string;
    }>;
}
