export declare class CreateLeadDto {
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
    lead_id?: string;
    user_id?: string;
}
