import { HermesService } from './hermes.service';
import { RunHermesDto } from './dto/run-hermes.dto';
interface JwtUser {
    userId: string;
    email: string;
    role: string;
    permissions: string[];
}
export declare class HermesController {
    private readonly hermes;
    constructor(hermes: HermesService);
    run(dto: RunHermesDto, user: JwtUser): Promise<{
        campaign_id: string;
        first_task: string;
    }>;
    campaign(id: string): Promise<(import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, import("./schemas/campaign.schema").Campaign, {}, {}> & import("./schemas/campaign.schema").Campaign & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null>;
}
export {};
