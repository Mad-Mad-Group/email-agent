import { HydratedDocument } from 'mongoose';
export type CampaignDocument = HydratedDocument<Campaign>;
export declare class Campaign {
    campaign_id: string;
    keyword?: string;
    location?: string;
    target_count?: number;
    status: string;
    pipeline_stage?: string;
    lead_ids: string[];
    done_count: number;
    _created_at?: string;
    _updated_at?: string;
}
export declare const CampaignSchema: import("mongoose").Schema<Campaign, import("mongoose").Model<Campaign, any, any, any, import("mongoose").Document<unknown, any, Campaign, any, {}> & Campaign & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Campaign, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Campaign>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Campaign> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
