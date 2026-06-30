export declare enum EmailStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    SENT = "sent",
    FAILED = "failed"
}
export declare const ALLOWED_TRANSITIONS: Record<EmailStatus, EmailStatus[]>;
export declare function canTransition(from: EmailStatus, to: EmailStatus): boolean;
export declare function normalizeStatus(raw: string | null | undefined): EmailStatus;
