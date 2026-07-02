import { LeadStatus } from './lead-status.enum';
export declare class ListLeadsQueryDto {
    page: number;
    limit: number;
    status?: LeadStatus;
    verification?: string;
    industry?: string;
    source?: string;
    search?: string;
}
