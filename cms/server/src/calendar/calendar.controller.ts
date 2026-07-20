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
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface JwtUser { userId: string; role: string; }

@ApiTags('行事曆')
@ApiBearerAuth()
@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get()
  async list(
    @Query('month') month?: string,
    @Query('year') year?: string,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.calendar.findAll(
      user?.userId,
      month ? +month : undefined,
      year ? +year : undefined,
    );
  }

  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user?: JwtUser) {
    return this.calendar.findOne(id, user?.userId);
  }

  @Post()
  async create(@Body() dto: CreateEventDto, @CurrentUser() user?: JwtUser) {
    return this.calendar.create(dto, user?.userId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateEventDto, @CurrentUser() user?: JwtUser) {
    return this.calendar.update(id, dto, user?.userId);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string, @CurrentUser() user?: JwtUser) {
    await this.calendar.remove(id, user?.userId);
    return { id };
  }
}
