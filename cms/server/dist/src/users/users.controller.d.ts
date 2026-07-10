import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
interface JwtUser {
    userId: string;
    role: string;
}
export declare class UserPrefsController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getNotificationPrefs(user: JwtUser): Promise<any>;
    updateNotificationPrefs(user: JwtUser, body: {
        email_on_complete?: boolean;
        browser_on_complete?: boolean;
    }): Promise<import("mongoose").FlattenMaps<{
        email_on_complete: boolean;
        browser_on_complete: boolean;
    }>>;
}
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(page?: string, limit?: string): Promise<{
        items: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/user.schema").User, {}, {}> & import("./schemas/user.schema").User & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/user.schema").User, {}, {}> & import("./schemas/user.schema").User & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
        total: number;
        page: number;
        limit: number;
    }>;
    findById(id: string): Promise<import("./schemas/user.schema").User>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<import("./schemas/user.schema").User | null>;
    delete(id: string): Promise<import("./schemas/user.schema").User | null>;
}
export {};
