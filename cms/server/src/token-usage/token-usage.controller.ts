import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TokenUsageService } from './token-usage.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface JwtUser {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
}

@ApiTags('Token Usage')
@ApiBearerAuth()
@Controller('token-usage')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TokenUsageController {
  constructor(private readonly service: TokenUsageService) {}

  /** Admin: 按用戶聚合 */
  @Get()
  @Roles('admin', 'super_admin')
  async getUsageByUser() {
    return this.service.aggregateByUser();
  }

  /** 當前用戶的時間序列 token 消耗 */
  @Get('timeseries')
  async getTimeSeries(
    @CurrentUser() user: JwtUser,
    @Query('granularity') granularity?: string,
  ) {
    const g = ['hour', 'day', 'week', 'month'].includes(granularity || '')
      ? (granularity as 'hour' | 'day' | 'week' | 'month')
      : 'month';
    return this.service.aggregateTimeSeries(user.userId, g);
  }

  /** 當前用戶的 token 餘額 / 用量統計 */
  @Get('balance')
  async getBalance(@CurrentUser() user: JwtUser) {
    return this.service.getUserBalance(user.userId);
  }
}
