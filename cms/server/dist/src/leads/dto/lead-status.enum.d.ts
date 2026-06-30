export declare enum LeadStatus {
    NEW = "new",
    PENDING = "pending",
    CONTACTED = "contacted"
}
export declare function normalizeStatus(raw: string | null | undefined): LeadStatus;
export declare function toDbStatus(s: LeadStatus): string | null;
export declare const ALLOWED_TRANSITIONS: Record<LeadStatus, LeadStatus[]>;
export declare function canTransition(from: LeadStatus, to: LeadStatus): boolean;
