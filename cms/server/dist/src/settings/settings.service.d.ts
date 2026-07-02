import { Model } from 'mongoose';
import { SettingDocument } from './schemas/setting.schema';
export declare class SettingsService {
    private settingModel;
    constructor(settingModel: Model<SettingDocument>);
    getAll(): Promise<SettingDocument[]>;
    getByKey(key: string): Promise<SettingDocument | null>;
    upsert(key: string, value: any, updatedBy: string): Promise<SettingDocument>;
}
