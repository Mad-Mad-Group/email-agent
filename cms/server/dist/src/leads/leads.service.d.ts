import { Model, Types } from 'mongoose';
import { Lead, LeadDocument } from './schemas/lead.schema';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { SseService } from '../sse/sse.service';
export declare class LeadsService {
    private readonly leadModel;
    private readonly sse?;
    constructor(leadModel: Model<LeadDocument>, sse?: SseService | undefined);
    create(dto: CreateLeadDto): Promise<LeadDocument>;
    findAll(q: ListLeadsQueryDto): Promise<{
        items: (import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, Lead, {}, {}> & Lead & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        }> & Required<{
            _id: Types.ObjectId;
        }>)[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: string): Promise<LeadDocument>;
    update(id: string, dto: UpdateLeadDto): Promise<LeadDocument>;
    changeStatus(id: string, dto: UpdateLeadStatusDto): Promise<LeadDocument>;
    markInterested(id: string): Promise<import("mongoose").Document<unknown, {}, Lead, {}, {}> & Lead & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    createFromSearch(data: {
        company_name: string;
        source: string;
        search_query?: string;
        address?: string;
        phone?: string;
        website?: string;
        google_maps_url?: string;
        category?: string;
    }): Promise<LeadDocument | null>;
    applyCollab(id: string, collab: {
        primary?: string;
        pitch?: string;
        reason?: string;
        services?: string[];
    }): Promise<LeadDocument>;
    markContactedByLeadId(leadId: string): Promise<void>;
    remove(id: string): Promise<void>;
    private nowStamp;
    private escapeRegex;
    private assertObjectId;
}
