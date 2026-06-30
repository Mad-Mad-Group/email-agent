import { TasksService } from '../tasks/tasks.service';
import { SearchDto } from './dto/search.dto';
export declare class SearchService {
    private readonly tasks;
    constructor(tasks: TasksService);
    run(dto: SearchDto): Promise<{
        task_id: string;
        status: string;
    }>;
}
