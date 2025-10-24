import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NeisService, TimetableParams } from './neis.service';
import { User, UserRole } from './entities/user.entity';
import { Student } from './entities/student.entity';
import { Teacher } from './entities/teacher.entity';

@Controller('neis')
export class NeisController {
  constructor(private readonly neisService: NeisService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('meal')
  async getMeal(
    @Request() req: { user: User | (User & Student) | (User & Teacher) },
    @Query('officeCode') officeCode: string,
    @Query('schoolCode') schoolCode: string,
    @Query('date') date?: string,
  ) {
    const user = req.user;
    const resolvedOfficeCode = officeCode ?? user?.educationOfficeCode;
    const resolvedSchoolCode = schoolCode ?? user?.schoolCode;

    if (!resolvedOfficeCode || !resolvedSchoolCode) {
      throw new BadRequestException('officeCode와 schoolCode는 필수 값입니다.');
    }

    return this.neisService.getMeals({
      officeCode: resolvedOfficeCode,
      schoolCode: resolvedSchoolCode,
      date,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('timetable')
  async getTimetable(
    @Request()
    req: {
      user: (User & Partial<Student> & Partial<Teacher>) | undefined;
    },
    @Query('officeCode') officeCode: string,
    @Query('schoolCode') schoolCode: string,
    @Query('grade') grade: string,
    @Query('className') className: string,
    @Query('date') date?: string,
    @Query('schoolType') schoolType?: TimetableParams['schoolType'],
  ) {
    const user = req.user;

    const resolvedOfficeCode = officeCode ?? user?.educationOfficeCode;
    const resolvedSchoolCode = schoolCode ?? user?.schoolCode;

    if (!resolvedOfficeCode || !resolvedSchoolCode) {
      throw new BadRequestException('officeCode와 schoolCode는 필수 값입니다.');
    }

    let resolvedGrade = grade;
    let resolvedClassName = className;

    if ((!resolvedGrade || !resolvedClassName) && user?.role === UserRole.STUDENT) {
      resolvedGrade = resolvedGrade ?? String((user as Student).grade);
      resolvedClassName = resolvedClassName ?? String((user as Student).class);
    }

    if (!resolvedGrade || !resolvedClassName) {
      throw new BadRequestException(
        'grade와 className은 필수 값입니다. (학생은 자동으로 채워집니다.)',
      );
    }

    return this.neisService.getTimetable({
      officeCode: resolvedOfficeCode,
      schoolCode: resolvedSchoolCode,
      grade: resolvedGrade,
      className: resolvedClassName,
      date,
      schoolType,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('timetable/week')
  async getWeeklyTimetable(
    @Request()
    req: {
      user: (User & Partial<Student> & Partial<Teacher>) | undefined;
    },
    @Query('officeCode') officeCode: string,
    @Query('schoolCode') schoolCode: string,
    @Query('grade') grade: string,
    @Query('className') className: string,
    @Query('date') date?: string,
    @Query('schoolType') schoolType?: TimetableParams['schoolType'],
  ) {
    const user = req.user;
    const resolvedOfficeCode = officeCode ?? user?.educationOfficeCode;
    const resolvedSchoolCode = schoolCode ?? user?.schoolCode;

    if (!resolvedOfficeCode || !resolvedSchoolCode) {
      throw new BadRequestException('officeCode와 schoolCode는 필수 값입니다.');
    }

    let resolvedGrade = grade;
    let resolvedClassName = className;

    if ((!resolvedGrade || !resolvedClassName) && user?.role === UserRole.STUDENT) {
      resolvedGrade = resolvedGrade ?? String((user as Student).grade);
      resolvedClassName = resolvedClassName ?? String((user as Student).class);
    }

    if (!resolvedGrade || !resolvedClassName) {
      throw new BadRequestException(
        'grade와 className은 필수 값입니다. (학생은 자동으로 채워집니다.)',
      );
    }

    return this.neisService.getWeeklyTimetable({
      officeCode: resolvedOfficeCode,
      schoolCode: resolvedSchoolCode,
      grade: resolvedGrade,
      className: resolvedClassName,
      date,
      schoolType,
    });
  }
}
