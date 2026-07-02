import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permission } from '../common/decorators/permission.decorator';

@ApiTags('Leads 搵客管理')
@ApiBearerAuth()
@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @Permission('leads.view')
  async list(@Query() query: ListLeadsQueryDto) {
    return this.leads.findAll(query);
  }

  @Get(':id')
  @Permission('leads.view')
  async get(@Param('id') id: string) {
    return this.leads.findOne(id);
  }

  @Post()
  @Permission('leads.create')
  async create(@Body() dto: CreateLeadDto) {
    return this.leads.create(dto);
  }

  @Patch(':id')
  @Permission('leads.update')
  async update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leads.update(id, dto);
  }

  @Patch(':id/status')
  @Permission('leads.update')
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    return this.leads.changeStatus(id, dto);
  }

  @Post(':id/mark-interested')
  @Permission('leads.update')
  async markInterested(@Param('id') id: string) {
    return this.leads.markInterested(id);
  }

  @Delete(':id')
  @HttpCode(200)
  @Permission('leads.delete')
  async remove(@Param('id') id: string) {
    await this.leads.remove(id);
    return { id };
  }
}
