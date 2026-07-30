import { PartialType } from '@nestjs/swagger';
import { CreatePipelineScheduleDto } from './create-pipeline-schedule.dto';

export class UpdatePipelineScheduleDto extends PartialType(CreatePipelineScheduleDto) {}
