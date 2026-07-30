import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

export class AgentQuotaAlertDto {
  /** worker 讀到嘅原始錯誤訊息 */
  @IsOptional() @IsString() detail?: string;
  @IsOptional() @IsString() agent_id?: string;
  @IsOptional() @IsString() skill_id?: string;
}

@ApiTags('Alerts 系統警報')
@ApiBearerAuth()
@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  /**
   * Worker 撞到 API token / quota 上限時呼叫。
   * 只需登入即可 —— worker 用自己嘅帳號 token 打。
   */
  @Post('agent-quota')
  @HttpCode(200)
  async agentQuota(@Body() dto: AgentQuotaAlertDto) {
    return this.alerts.agentQuotaExceeded(dto);
  }
}
