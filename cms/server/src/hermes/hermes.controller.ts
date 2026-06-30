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
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permission } from '../common/decorators/permission.decorator';

@ApiTags('Hermes Pipeline 指揮')
@ApiBearerAuth()
@Controller('hermes')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class HermesController {
  constructor(private readonly hermes: HermesService) {}

  @Post('run')
  @HttpCode(200)
  @Permission('hermes.run')
  async run(@Body() dto: RunHermesDto) {
    return this.hermes.run(dto);
  }

  @Get('campaigns/:id')
  @Permission('hermes.run')
  async campaign(@Param('id') id: string) {
    return this.hermes.getCampaign(id);
  }
}
