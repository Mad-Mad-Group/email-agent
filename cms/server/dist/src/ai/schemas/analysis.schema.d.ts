import { HydratedDocument } from 'mongoose';
export type AnalysisDocument = HydratedDocument<Analysis>;
export declare class Analysis {
    lead_id?: string;
    analysis_type?: string;
    ai_summary?: string;
    all_text?: string;
    website_title?: string;
    emails_found?: string[];
    phones_found?: string[];
    _analyzed_at?: string;
    _summary_at?: string;
}
export declare const AnalysisSchema: import("mongoose").Schema<Analysis, import("mongoose").Model<Analysis, any, any, any, import("mongoose").Document<unknown, any, Analysis, any, {}> & Analysis & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Analysis, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Analysis>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Analysis> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
