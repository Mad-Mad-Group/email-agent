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
import { HermesService } from './hermes.service';
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

  @Get('campaigns/:id')
  async campaign(@Param('id') id: string) {
    return this.hermes.getCampaign(id);
  }
}
