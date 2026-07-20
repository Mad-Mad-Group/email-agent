import { Model } from 'mongoose';
import { LeadsService } from '../leads/leads.service';
import { TasksService } from '../tasks/tasks.service';
import { Analysis, AnalysisDocument } from './schemas/analysis.schema';
export declare class AiAnalysisService {
    private readonly analysisModel;
    private readonly leads;
    private readonly tasks;
    constructor(analysisModel: Model<AnalysisDocument>, leads: LeadsService, tasks: TasksService);
    analyzeLead(id: string, userId?: string): Promise<{
        task_id: string;
        status: string;
        lead_id: string | undefined;
    }>;
    listForLead(id: string): Promise<(import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, Analysis, {}, {}> & Analysis & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
}
