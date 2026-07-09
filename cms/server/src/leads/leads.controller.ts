import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TasksService } from '../tasks/tasks.service';
import { SKILL } from '../tasks/dto/task-status.enum';

interface JwtUser {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
}

/** admin / super_admin 可睇全部 leads */
function isAdmin(user: JwtUser): boolean {
  return user.role === 'admin' || user.role === 'super_admin';
}

const STAGE_SKILL_MAP: Record<string, string> = {
  enrich: SKILL.ANALYZE,
  analyze: SKILL.ANALYZE,
  draft: SKILL.EMAIL_DRAFT,
  send: SKILL.EMAIL_SEND,
};

@ApiTags('Leads 搵客管理')
@ApiBearerAuth()
@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadsController {
  constructor(
    private readonly leads: LeadsService,
    private readonly tasks: TasksService,
  ) {}

  @Get()
  async list(@Query() query: ListLeadsQueryDto, @CurrentUser() user: JwtUser) {
    return this.leads.findAll(query, isAdmin(user) ? undefined : user.userId);
  }

  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.leads.findOne(id, isAdmin(user) ? undefined : user.userId);
  }

  @Post()
  async create(@Body() dto: CreateLeadDto, @CurrentUser() user: JwtUser) {
    return this.leads.create(dto, user.userId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateLeadDto, @CurrentUser() user: JwtUser) {
    return this.leads.update(id, dto, isAdmin(user) ? undefined : user.userId);
  }

  @Patch(':id/status')
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.leads.changeStatus(id, dto, isAdmin(user) ? undefined : user.userId);
  }

  @Post(':id/mark-interested')
  async markInterested(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.leads.markInterested(id, isAdmin(user) ? undefined : user.userId);
  }

  /** POST /leads/:id/reprocess?stage=enrich|analyze|draft|send */
  @Post(':id/reprocess')
  async reprocess(
    @Param('id') id: string,
    @Query('stage') stage: string,
    @CurrentUser() user: JwtUser,
  ) {
    const skillId = STAGE_SKILL_MAP[stage];
    if (!skillId) {
      throw new BadRequestException(
        `Invalid stage: ${stage}. Valid: enrich, analyze, draft, send`,
      );
    }
    const lead = await this.leads.findOne(id, isAdmin(user) ? undefined : user.userId);
    if (!lead) throw new NotFoundException('Lead not found');

    const task = await this.tasks.enqueue({
      skill_id: skillId,
      title: `[手動重跑] ${stage} — ${(lead as any).company_name || id}`,
      params: { lead_object_id: id, user_id: user.userId, manual_reprocess: true },
    });
    return { task_id: task.task_id, stage, lead_id: id };
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    await this.leads.remove(id, isAdmin(user) ? undefined : user.userId);
    return { id };
  }

  @Delete()
  @HttpCode(200)
  @Roles('super_admin')
  async clearAll() {
    const count = await this.leads.clearAll();
    return { deleted: count };
  }
}
