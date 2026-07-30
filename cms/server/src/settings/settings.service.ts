import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Setting, SettingDocument } from './schemas/setting.schema';
import { AGENT_CONCURRENCY_KEY, sanitizeAgentConcurrency } from './agent-concurrency';

@Injectable()
export class SettingsService {
  constructor(@InjectModel(Setting.name) private settingModel: Model<SettingDocument>) {}

  async getAll(): Promise<SettingDocument[]> {
    return this.settingModel.find().exec();
  }

  async getByKey(key: string): Promise<SettingDocument | null> {
    return this.settingModel.findOne({ key }).exec();
  }

  async upsert(key: string, value: any, updatedBy: string): Promise<SettingDocument> {
    // agent_concurrency 直接影響 worker 會唔會 claim task，
    // 所以喺入庫前夾好範圍，唔可以靠前端驗證。
    if (key === AGENT_CONCURRENCY_KEY) {
      value = sanitizeAgentConcurrency(value);
    }

    return this.settingModel
      .findOneAndUpdate(
        { key },
        { value, updated_at: new Date(), updated_by: updatedBy },
        { upsert: true, new: true },
      )
      .exec();
  }
}
