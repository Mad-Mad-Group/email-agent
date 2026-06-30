export declare const EMAIL_SENDER: unique symbol;
export interface SendMail {
    to: string;
    subject: string;
    body: string;
}
export interface EmailSender {
    send(mail: SendMail): Promise<{
        ok: boolean;
        error?: string;
    }>;
}
export declare class FakeEmailSender implements EmailSender {
    send(mail: SendMail): Promise<{
        ok: boolean;
        error?: string;
    }>;
}
