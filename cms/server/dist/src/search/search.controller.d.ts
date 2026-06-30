import { SearchService } from './search.service';
import { SearchDto } from './dto/search.dto';
export declare class SearchController {
    private readonly search;
    constructor(search: SearchService);
    run(dto: SearchDto): Promise<{
        task_id: string;
        status: string;
    }>;
}
