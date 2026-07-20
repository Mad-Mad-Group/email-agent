import { HydratedDocument } from 'mongoose';
export type LeadDocument = HydratedDocument<Lead>;
export declare class Lead {
    lead_id?: string;
    user_id?: string;
    company_name: string;
    industry_tags?: string[];
    source?: string;
    google_maps_url?: string;
    search_query?: string;
    email?: string;
    extra_emails?: string[];
    phone?: string;
    extra_phones?: string[];
    website?: string;
    address?: string;
    social_media?: Record<string, string>;
    rating?: string;
    website_description?: string;
    _website_description?: string;
    _website_services?: string;
    _website_researched?: boolean;
    status?: string | null;
    _email_sent?: boolean;
    _email_sent_at?: string;
    _no_reply?: boolean;
    _followup_count?: number;
    _followup_draft?: string;
    _status?: string;
    _has_analysis?: boolean;
    _has_email_draft?: boolean;
    _has_wa_message?: boolean;
    email_draft?: string;
    _email_draft_score?: number;
    _email_draft_score_reason?: string;
    _email_draft_scored_at?: string;
    _collab_primary?: string;
    _collab_pitch?: string;
    _collab_reason?: string;
    _collab_services?: string[];
    _collab_generated_at?: string;
    _wa_link?: string;
    _wa_message?: string;
    _imported_at?: string;
    _cleaned_at?: string;
    _analyzed_at?: string;
    _deleted_at?: string | null;
}
export declare const LeadSchema: import("mongoose").Schema<Lead, import("mongoose").Model<Lead, any, any, any, import("mongoose").Document<unknown, any, Lead, any, {}> & Lead & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Lead, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Lead>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Lead> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
