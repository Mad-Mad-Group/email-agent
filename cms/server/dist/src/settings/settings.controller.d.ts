import { SettingsService } from './settings.service';
export declare class SettingsController {
    private readonly settingsService;
    constructor(settingsService: SettingsService);
    getAll(): Promise<import("./schemas/setting.schema").SettingDocument[]>;
    update(body: {
        settings: Record<string, any>;
    }, req: any): Promise<any[]>;
}
