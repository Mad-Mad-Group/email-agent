import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
export declare class RolesController {
    private readonly rolesService;
    constructor(rolesService: RolesService);
    findAll(page?: string, limit?: string): Promise<{
        items: (import("mongoose").Document<unknown, {}, import("./schemas/role.schema").RoleDocument, {}, {}> & import("./schemas/role.schema").Role & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    findById(id: string): Promise<import("./schemas/role.schema").RoleDocument | null>;
    create(createRoleDto: CreateRoleDto): Promise<import("./schemas/role.schema").RoleDocument>;
    update(id: string, updateRoleDto: UpdateRoleDto): Promise<import("./schemas/role.schema").RoleDocument | null>;
    delete(id: string): Promise<import("./schemas/role.schema").RoleDocument | null>;
}
