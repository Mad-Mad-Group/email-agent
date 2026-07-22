import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TokenUsage, TokenUsageDocument } from './schemas/token-usage.schema';

@Injectable()
export class TokenUsageService {
  constructor(
    @InjectModel(TokenUsage.name)
    private readonly model: Model<TokenUsageDocument>,
  ) {}

  /** 按用戶聚合 token 使用量 */
  async aggregateByUser(): Promise<
    { user_id: string; total_tokens: number; prompt_tokens: number; completion_tokens: number; call_count: number }[]
  > {
    return this.model.aggregate([
      {
        $group: {
          _id: '$user_id',
          total_tokens: { $sum: '$total_tokens' },
          prompt_tokens: { $sum: '$prompt_tokens' },
          completion_tokens: { $sum: '$completion_tokens' },
          call_count: { $sum: 1 },
        },
      },
      { $sort: { total_tokens: -1 } },
      {
        $project: {
          _id: 0,
          user_id: '$_id',
          total_tokens: 1,
          prompt_tokens: 1,
          completion_tokens: 1,
          call_count: 1,
        },
      },
    ]);
  }
}
