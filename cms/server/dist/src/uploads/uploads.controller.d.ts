import { UploadsService } from './uploads.service';
export declare class UploadsController {
    private readonly uploadsService;
    constructor(uploadsService: UploadsService);
    upload(file: any): {
        filename: any;
        originalName: any;
        path: any;
        size: any;
        mimetype: any;
    };
}
