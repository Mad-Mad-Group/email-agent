import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PipelineSchedulesService } from './pipeline-schedules.service';
import { CreatePipelineScheduleDto } from './dto/create-pipeline-schedule.dto';
import { UpdatePipelineScheduleDto } from './dto/update-pipeline-schedule.dto';

@Controller('api/pipeline-schedules')
@UseGuards(AuthGuard('jwt'))
export class PipelineSchedulesController {
  constructor(private readonly service: PipelineSchedulesService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(req.user?.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePipelineScheduleDto, @Req() req: any) {
    return this.service.create(dto, req.user?.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePipelineScheduleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.service.toggle(id);
  }

  @Post(':id/trigger')
  triggerNow(@Param('id') id: string) {
    return this.service.triggerNow(id);
  }
}
