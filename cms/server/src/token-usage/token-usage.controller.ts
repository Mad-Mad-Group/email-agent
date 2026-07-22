import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TokenUsageService } from './token-usage.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Token Usage')
@ApiBearerAuth()
@Controller('token-usage')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class TokenUsageController {
  constructor(private readonly service: TokenUsageService) {}

  @Get()
  async getUsageByUser() {
    return this.service.aggregateByUser();
  }
}
