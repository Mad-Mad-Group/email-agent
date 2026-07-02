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
  ) {
    return this.calendar.findAll(
      month ? +month : undefined,
      year ? +year : undefined,
    );
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.calendar.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateEventDto) {
    return this.calendar.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.calendar.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string) {
    await this.calendar.remove(id);
    return { id };
  }
}
