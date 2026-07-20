import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AiAnalysisService } from './ai-analysis.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permission } from '../common/decorators/permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface JwtUser { userId: string; role: string; }

@ApiTags('AI 分析')
@ApiBearerAuth()
@Controller('ai/leads')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AiAnalysisController {
  constructor(private readonly svc: AiAnalysisService) {}

  @Post(':id/analyze')
  @HttpCode(200)
  @Permission('ai.analyze')
  async analyze(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.svc.analyzeLead(id, user.userId);
  }

  @Get(':id/analyses')
  @Permission('ai.view')
  async list(@Param('id') id: string) {
    return this.svc.listForLead(id);
  }
}
