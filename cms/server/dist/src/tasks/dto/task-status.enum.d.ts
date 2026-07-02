export declare enum TaskStatus {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed"
}
export declare const SKILL: {
    readonly SEARCH: "S1";
    readonly ANALYZE: "S2";
    readonly EMAIL_DRAFT: "S3";
    readonly EMAIL_SEND: "S4";
};
export type SkillId = (typeof SKILL)[keyof typeof SKILL];
