import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permission } from '../common/decorators/permission.decorator';

@ApiTags('Jobs 排程任務')
@ApiBearerAuth()
@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Post(':name/run')
  @HttpCode(200)
  @Permission('jobs.run')
  async run(@Param('name') name: string) {
    return this.jobs.run(name);
  }

  @Post('demo-mode')
  @HttpCode(200)
  @Permission('jobs.run')
  toggleDemoMode() {
    return this.jobs.toggleDemoMode();
  }

  @Get('demo-mode')
  @Permission('jobs.run')
  getDemoMode() {
    return { demoMode: this.jobs.demoMode };
  }
}
