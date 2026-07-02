import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import {
  EnqueueTaskDto,
  ClaimTaskDto,
  CompleteTaskDto,
  FailTaskDto,
  ListTasksQueryDto,
} from './dto/task-dtos';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

/**
 * Task queue = NestJS ↔ Hermes agent 契約。
 * Admin：list / get / enqueue。Agent：claim / complete / fail。
 */
@ApiTags('Tasks 派工佇列')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  async list(@Query() q: ListTasksQueryDto) {
    return this.tasks.findAll(q);
  }

  @Get(':taskId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  async get(@Param('taskId') taskId: string) {
    return this.tasks.findByTaskId(taskId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  async enqueue(@Body() dto: EnqueueTaskDto) {
    return this.tasks.enqueue(dto);
  }

  // ---- 俾 Hermes agent（暫不加 Guard，之後用 agent token 保護）----
  @Post('claim')
  @HttpCode(200)
  async claim(@Body() dto: ClaimTaskDto) {
    return this.tasks.claimNext(dto);
  }

  @Post(':taskId/complete')
  @HttpCode(200)
  async complete(
    @Param('taskId') taskId: string,
    @Body() dto: CompleteTaskDto,
  ) {
    return this.tasks.complete(taskId, dto.result);
  }

  @Post(':taskId/fail')
  @HttpCode(200)
  async fail(@Param('taskId') taskId: string, @Body() dto: FailTaskDto) {
    return this.tasks.fail(taskId, dto.error);
  }
}
