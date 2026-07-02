import { Connection } from 'mongoose';
export declare class AppController {
    private readonly db;
    constructor(db: Connection);
    health(): {
        server: string;
        db: string;
        uptime: number;
        timestamp: string;
    };
}
