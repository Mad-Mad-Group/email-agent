import { Model } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
export declare class RolesService {
    private roleModel;
    constructor(roleModel: Model<RoleDocument>);
    findAll(page?: number, limit?: number): Promise<{
        items: (import("mongoose").Document<unknown, {}, RoleDocument, {}, {}> & Role & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    findById(id: string): Promise<RoleDocument | null>;
    findByName(name: string): Promise<RoleDocument | null>;
    create(createRoleDto: CreateRoleDto): Promise<RoleDocument>;
    update(id: string, updateRoleDto: UpdateRoleDto): Promise<RoleDocument | null>;
    delete(id: string): Promise<RoleDocument | null>;
}
