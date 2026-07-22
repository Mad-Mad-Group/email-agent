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

  /** 按時間粒度聚合 token 消耗 (hour / day / week / month) */
  async aggregateTimeSeries(
    userId: string,
    granularity: 'hour' | 'day' | 'week' | 'month' = 'month',
  ): Promise<
    { period: string; total_tokens: number; prompt_tokens: number; completion_tokens: number; call_count: number }[]
  > {
    const dateGroupExpr = this.getDateGroupExpr(granularity);

    return this.model.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: dateGroupExpr,
          total_tokens: { $sum: '$total_tokens' },
          prompt_tokens: { $sum: '$prompt_tokens' },
          completion_tokens: { $sum: '$completion_tokens' },
          call_count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          period: '$_id',
          total_tokens: 1,
          prompt_tokens: 1,
          completion_tokens: 1,
          call_count: 1,
        },
      },
    ]);
  }

  /** 取得單一用戶的 token 統計（總量、已用） */
  async getUserBalance(userId: string): Promise<{
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    call_count: number;
  }> {
    const result = await this.model.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: null,
          total_tokens: { $sum: '$total_tokens' },
          prompt_tokens: { $sum: '$prompt_tokens' },
          completion_tokens: { $sum: '$completion_tokens' },
          call_count: { $sum: 1 },
        },
      },
      { $project: { _id: 0 } },
    ]);
    return result[0] || { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0, call_count: 0 };
  }

  private getDateGroupExpr(granularity: 'hour' | 'day' | 'week' | 'month') {
    switch (granularity) {
      case 'hour':
        return {
          $dateToString: { format: '%Y-%m-%d %H:00', date: '$created_at' },
        };
      case 'day':
        return {
          $dateToString: { format: '%Y-%m-%d', date: '$created_at' },
        };
      case 'week':
        return {
          $dateToString: { format: '%G-W%V', date: '$created_at' },
        };
      case 'month':
        return {
          $dateToString: { format: '%Y-%m', date: '$created_at' },
        };
    }
  }
}
