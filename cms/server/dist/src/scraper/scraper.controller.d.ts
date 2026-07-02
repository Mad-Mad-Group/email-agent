import { ScraperService } from './scraper.service';
export declare class ScraperController {
    private readonly scraper;
    constructor(scraper: ScraperService);
    scrape(id: string): Promise<{
        task_id: string;
        status: string;
        lead_id: string | undefined;
    }>;
}
