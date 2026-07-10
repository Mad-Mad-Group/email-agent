import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { TasksService } from '../tasks/tasks.service';
interface JwtUser {
    userId: string;
    email: string;
    role: string;
    permissions: string[];
}
export declare class LeadsController {
    private readonly leads;
    private readonly tasks;
    constructor(leads: LeadsService, tasks: TasksService);
    list(query: ListLeadsQueryDto, user: JwtUser): Promise<{
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
    get(id: string, user: JwtUser): Promise<import("mongoose").Document<unknown, {}, import("./schemas/lead.schema").Lead, {}, {}> & import("./schemas/lead.schema").Lead & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    create(dto: CreateLeadDto, user: JwtUser): Promise<import("mongoose").Document<unknown, {}, import("./schemas/lead.schema").Lead, {}, {}> & import("./schemas/lead.schema").Lead & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    update(id: string, dto: UpdateLeadDto, user: JwtUser): Promise<import("mongoose").Document<unknown, {}, import("./schemas/lead.schema").Lead, {}, {}> & import("./schemas/lead.schema").Lead & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    changeStatus(id: string, dto: UpdateLeadStatusDto, user: JwtUser): Promise<import("mongoose").Document<unknown, {}, import("./schemas/lead.schema").Lead, {}, {}> & import("./schemas/lead.schema").Lead & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    markInterested(id: string, user: JwtUser): Promise<import("mongoose").Document<unknown, {}, import("./schemas/lead.schema").Lead, {}, {}> & import("./schemas/lead.schema").Lead & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    reprocess(id: string, stage: string, user: JwtUser): Promise<{
        task_id: string;
        stage: string;
        lead_id: string;
    }>;
    remove(id: string, user: JwtUser): Promise<{
        id: string;
    }>;
    clearAll(): Promise<{
        deleted: number;
    }>;
}
export {};
