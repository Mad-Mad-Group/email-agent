import { SearchService } from './search.service';
import { SearchDto } from './dto/search.dto';
interface JwtUser {
    userId: string;
    email: string;
    role: string;
    permissions: string[];
}
export declare class SearchController {
    private readonly search;
    constructor(search: SearchService);
    run(dto: SearchDto, user: JwtUser): Promise<{
        task_id: string;
        status: string;
        deduped: boolean;
    } | {
        task_id: string;
        status: string;
        deduped?: undefined;
    }>;
}
export {};
