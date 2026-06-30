import { EmailStatus } from './email-status.enum';
export declare class ListEmailQueueQueryDto {
    page: number;
    limit: number;
    status?: EmailStatus;
    search?: string;
}
