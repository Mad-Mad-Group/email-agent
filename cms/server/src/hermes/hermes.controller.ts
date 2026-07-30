import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HermesService, CampaignWithQueue } from './hermes.service';
import { RunHermesDto } from './dto/run-hermes.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface JwtUser { userId: string; email: string; role: string; permissions: string[]; }

@ApiTags('Hermes Pipeline 指揮')
@ApiBearerAuth()
@Controller('hermes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HermesController {
  constructor(private readonly hermes: HermesService) {}

  @Post('run')
  @HttpCode(200)
  async run(@Body() dto: RunHermesDto, @CurrentUser() user: JwtUser) {
    return this.hermes.run(dto, user.userId);
  }

  /** 必須排喺 'campaigns/:id' 之前，否則 'active' 會被當成 id */
  @Get('campaigns/active')
  async activeCampaign(@CurrentUser() user: JwtUser): Promise<CampaignWithQueue | null> {
    return this.hermes.getActiveCampaign(user.userId);
  }

  @Get('campaigns/:id')
  async campaign(@Param('id') id: string): Promise<CampaignWithQueue | null> {
    return this.hermes.getCampaign(id);
  }

  /** 用戶主動停止一條 pipeline */
  @Post('campaigns/:id/cancel')
  @HttpCode(200)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
  ): Promise<CampaignWithQueue | null> {
    return this.hermes.cancelCampaign(id, user.userId);
  }
}
