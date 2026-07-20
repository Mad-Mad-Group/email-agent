import { AiAnalysisService } from './ai-analysis.service';
interface JwtUser {
    userId: string;
    role: string;
}
export declare class AiAnalysisController {
    private readonly svc;
    constructor(svc: AiAnalysisService);
    analyze(id: string, user: JwtUser): Promise<{
        task_id: string;
        status: string;
        lead_id: string | undefined;
    }>;
    list(id: string): Promise<(import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, import("./schemas/analysis.schema").Analysis, {}, {}> & import("./schemas/analysis.schema").Analysis & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
}
export {};
