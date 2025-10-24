import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { CreateStudentEventDto } from './dto/create-student-event.dto';
import { CreatePersonalEventDto } from './dto/create-personal-event.dto';
import { CreateClassAssignmentDto } from './dto/create-class-assignment.dto';
import { CalendarEventResponse } from './dto/calendar-event-response.dto';
import { CreateUrgentNoticeDto } from './dto/create-urgent-notice.dto';
import { UserRole } from '../user/entities/user.entity';

@ApiTags('Calendar')
@ApiBearerAuth('access-token')
@ApiExtraModels(CalendarEventResponse)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '학생 일정 등록' })
  @ApiOkResponse({ type: CalendarEventResponse })
  @Post('student')
  async createStudentEvent(
    @Request() req,
    @Body(new ValidationPipe({ transform: true }))
    body: CreateStudentEventDto,
  ): Promise<CalendarEventResponse> {
    if (req.user?.role !== UserRole.STUDENT) {
      throw new ForbiddenException('학생만 일정을 등록할 수 있습니다.');
    }

    return this.calendarService.createStudentEvent(req.user, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '개인 일정 등록' })
  @ApiOkResponse({ type: CalendarEventResponse })
  @Post('personal')
  async createPersonalEvent(
    @Request() req,
    @Body(new ValidationPipe({ transform: true }))
    body: CreatePersonalEventDto,
  ): Promise<CalendarEventResponse> {
    return this.calendarService.createPersonalEvent(req.user, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '담임 과제 마감 등록' })
  @ApiOkResponse({ type: CalendarEventResponse })
  @Post('class-assignment')
  async createClassAssignment(
    @Request() req,
    @Body(new ValidationPipe({ transform: true }))
    body: CreateClassAssignmentDto,
  ): Promise<CalendarEventResponse> {
    if (req.user?.role !== UserRole.TEACHER) {
      throw new ForbiddenException('교사만 과제를 등록할 수 있습니다.');
    }

    return this.calendarService.createClassAssignment(req.user, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '긴급 공지 등록' })
  @ApiOkResponse({ type: CalendarEventResponse })
  @Post('urgent-notice')
  async createUrgentNotice(
    @Request() req,
    @Body(new ValidationPipe({ transform: true }))
    body: CreateUrgentNoticeDto,
  ): Promise<CalendarEventResponse> {
    if (req.user?.role !== UserRole.TEACHER) {
      throw new ForbiddenException('교사만 긴급 공지를 등록할 수 있습니다.');
    }

    return this.calendarService.createUrgentNotice(req.user, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '내 캘린더 조회' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: { $ref: getSchemaPath(CalendarEventResponse) },
        },
      },
    },
  })
  @Get('my')
  async getMyEvents(@Request() req): Promise<{ events: CalendarEventResponse[] }> {
    const events = await this.calendarService.getEventsForUser(req.user);
    return { events };
  }
}
