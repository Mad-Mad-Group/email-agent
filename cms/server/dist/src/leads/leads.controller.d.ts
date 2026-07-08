import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
export declare class LeadsController {
    private readonly leads;
    constructor(leads: LeadsService);
    list(query: ListLeadsQueryDto): Promise<{
        items: (import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, import("./schemas/lead.schema").Lead, {}, {}> & import("./schemas/lead.schema").Lead & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
        total: number;
        page: number;
        limit: number;
    }>;
    get(id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/lead.schema").Lead, {}, {}> & import("./schemas/lead.schema").Lead & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    create(dto: CreateLeadDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/lead.schema").Lead, {}, {}> & import("./schemas/lead.schema").Lead & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    update(id: string, dto: UpdateLeadDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/lead.schema").Lead, {}, {}> & import("./schemas/lead.schema").Lead & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    changeStatus(id: string, dto: UpdateLeadStatusDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/lead.schema").Lead, {}, {}> & import("./schemas/lead.schema").Lead & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    markInterested(id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/lead.schema").Lead, {}, {}> & import("./schemas/lead.schema").Lead & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    remove(id: string): Promise<{
        id: string;
    }>;
    clearAll(): Promise<{
        deleted: number;
    }>;
}
