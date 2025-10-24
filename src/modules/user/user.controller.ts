import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  Get,
  UseGuards,
  Request,
  Query,
  BadRequestException,
  Patch,
  ForbiddenException,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateClassCoinDto } from './dto/update-class-coin.dto';
import { CompleteMissionDto } from './dto/complete-mission.dto';
import { CreateEmergencyMissionDto } from './dto/create-emergency-mission.dto';
import { ReviewMissionSubmissionDto } from './dto/review-mission-submission.dto';
import { UserRole } from './entities/user.entity';
import { Student } from './entities/student.entity';

@ApiTags('User')
@ApiExtraModels(CreateStudentDto, CreateTeacherDto)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @ApiOperation({
    summary: '회원 가입',
    description: '학생 또는 교사 사용자 계정을 생성합니다.',
  })
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(CreateStudentDto) },
        { $ref: getSchemaPath(CreateTeacherDto) },
      ],
    },
  })
  async register(
    @Body(new ValidationPipe()) body: CreateStudentDto | CreateTeacherDto,
  ) {
    await this.userService.register(body);
    return { message: '정상적으로 생성되었습니다' };
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '내 프로필 조회' })
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '미션 완료 보고' })
  @ApiBody({ type: CompleteMissionDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        coinDelta: { type: 'number' },
        totalCoin: { type: 'number' },
        level: { type: 'number' },
        image: { type: 'string' },
        dailyRegularCoin: { type: 'number' },
        bonusGranted: { type: 'boolean' },
        status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
        logId: { type: 'number' },
      },
    },
  })
  @Post('mission/complete')
  async completeMission(
    @Request() req,
    @Body(new ValidationPipe({ transform: true }))
    body: CompleteMissionDto,
  ) {
    const user = req.user;

    if (user?.role !== UserRole.STUDENT) {
      throw new ForbiddenException('학생만 미션을 완료할 수 있습니다.');
    }

    return this.userService.completeMission(user.id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '기본 미션 조회',
    description: '랜덤으로 2개의 기본 미션을 제공합니다.',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        missions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              title: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @Get('missions')
  async getDailyMissions() {
    const missions = await this.userService.getDailyMissions();
    return {
      missions: missions.map((mission) => ({
        id: mission.id,
        title: mission.title,
        description: mission.description,
      })),
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '긴급 미션 조회' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        missions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              title: { type: 'string' },
              description: { type: 'string' },
              deadline: { type: 'string', format: 'date-time', nullable: true },
              classInfo: {
                type: 'object',
                nullable: true,
                properties: {
                  grade: { type: 'number' },
                  classNumber: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  })
  @Get('missions/emergency')
  async getEmergencyMissions(@Request() req) {
    const missions = await this.userService.getEmergencyMissionsForUser(req.user);
    return {
      missions: missions.map((mission) => ({
        id: mission.id,
        title: mission.title,
        description: mission.description,
        deadline: mission.deadline ?? null,
        classInfo: mission.schoolClass
          ? {
              grade: mission.schoolClass.grade,
              classNumber: mission.schoolClass.classNumber,
            }
          : null,
      })),
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '긴급 미션 등록' })
  @ApiBody({ type: CreateEmergencyMissionDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        title: { type: 'string' },
        description: { type: 'string' },
        deadline: { type: 'string', format: 'date-time', nullable: true },
        classInfo: {
          type: 'object',
          nullable: true,
          properties: {
            grade: { type: 'number' },
            classNumber: { type: 'number' },
          },
        },
      },
    },
  })
  @Post('missions/emergency')
  async createEmergencyMission(
    @Request() req,
    @Body(new ValidationPipe({ transform: true }))
    body: CreateEmergencyMissionDto,
  ) {
    if (req.user?.role !== UserRole.TEACHER) {
      throw new ForbiddenException('교사만 긴급 미션을 등록할 수 있습니다.');
    }

    const mission = await this.userService.createEmergencyMission(req.user, body);
    return {
      id: mission.id,
      title: mission.title,
      description: mission.description,
      deadline: mission.deadline ?? null,
      classInfo: mission.schoolClass
        ? {
            grade: mission.schoolClass.grade,
            classNumber: mission.schoolClass.classNumber,
          }
        : null,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '승인 대기 미션 목록 조회' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        submissions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              logId: { type: 'number' },
              student: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                  userId: { type: 'string' },
                },
              },
              mission: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'number' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                },
              },
              missionType: { type: 'string', enum: ['regular', 'emergency'] },
              coinDelta: { type: 'number' },
              date: { type: 'string' },
              submittedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @Get('missions/pending')
  async getPendingMissionSubmissions(@Request() req) {
    if (req.user?.role !== UserRole.TEACHER) {
      throw new ForbiddenException('교사만 승인 대기 미션을 조회할 수 있습니다.');
    }

    const submissions = await this.userService.getPendingMissionLogsForTeacher(
      req.user,
    );

    return {
      submissions: submissions.map((log) => ({
        logId: log.id,
        student: {
          id: log.student.id,
          name: log.student.name,
          userId: log.student.userId,
        },
        mission: log.mission
          ? {
              id: log.mission.id,
              title: log.mission.title,
              description: log.mission.description,
            }
          : null,
        missionType: log.missionType,
        coinDelta: log.coinDelta,
        date: log.date,
        submittedAt: log.createdAt,
      })),
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '미션 승인/거절' })
  @ApiBody({ type: ReviewMissionSubmissionDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['approved', 'rejected'] },
        coinDelta: { type: 'number' },
        totalCoin: { type: 'number' },
        level: { type: 'number' },
        image: { type: 'string' },
        bonusGranted: { type: 'boolean' },
        rejectionReason: { type: 'string', nullable: true },
      },
    },
  })
  @Post('missions/:logId/review')
  async reviewMissionSubmission(
    @Request() req,
    @Param('logId', ParseIntPipe) logId: number,
    @Body(new ValidationPipe({ transform: true }))
    body: ReviewMissionSubmissionDto,
  ) {
    if (req.user?.role !== UserRole.TEACHER) {
      throw new ForbiddenException('교사만 미션을 승인하거나 거절할 수 있습니다.');
    }

    return this.userService.reviewMissionSubmission(logId, req.user, body);
  }

  @ApiOperation({ summary: '아이디 중복 확인' })
  @Get('haveId')
  async checkUserId(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId는 필수 값입니다.');
    }
    const available = await this.userService.isUserIdAvailable(userId);
    return { haveId: !available };
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '반 캐릭터 조회' })
  @ApiQuery({ name: 'grade', required: false, description: '조회할 학년' })
  @ApiQuery({ name: 'classNumber', required: false, description: '조회할 반' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        coinCount: { type: 'number', description: '반 누적 코인 수' },
        level: { type: 'number', description: '캐릭터 레벨(0~6)' },
        image: {
          type: 'string',
          description: '캐릭터 이미지 URL',
          example: '/static/images/3.svg',
        },
      },
    },
  })
  @Get('class/character')
  async getClassCharacter(
    @Request() req,
    @Query('grade') grade?: string,
    @Query('classNumber') classNumber?: string,
    @Query('educationOfficeCode') educationOfficeCode?: string,
    @Query('schoolCode') schoolCode?: string,
  ) {
    const user = req.user as Student;

    const resolvedOfficeCode =
      educationOfficeCode ?? user?.educationOfficeCode;
    const resolvedSchoolCode = schoolCode ?? user?.schoolCode;

    const resolvedGrade =
      grade !== undefined ? Number(grade) : user?.grade ?? undefined;
    const resolvedClassNumber =
      classNumber !== undefined
        ? Number(classNumber)
        : (user as Student)?.class ?? undefined;

    if (!resolvedOfficeCode || !resolvedSchoolCode) {
      throw new BadRequestException(
        'educationOfficeCode와 schoolCode는 필수 값입니다.',
      );
    }

    if (
      resolvedGrade === undefined ||
      Number.isNaN(resolvedGrade) ||
      resolvedClassNumber === undefined ||
      Number.isNaN(resolvedClassNumber)
    ) {
      throw new BadRequestException(
        'grade와 classNumber는 필수 값입니다. (학생은 자동으로 채워집니다.)',
      );
    }

    return this.userService.getClassCharacter({
      educationOfficeCode: resolvedOfficeCode,
      schoolCode: resolvedSchoolCode,
      grade: resolvedGrade,
      classNumber: resolvedClassNumber,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '반 코인 증가' })
  @ApiBody({ type: UpdateClassCoinDto })
  @Patch('class/coin')
  async updateClassCoin(
    @Request() req,
    @Body(new ValidationPipe({ transform: true }))
    body: UpdateClassCoinDto,
  ) {
    const user = req.user;

    if (user?.role === UserRole.STUDENT) {
      throw new ForbiddenException('학생은 코인 정보를 수정할 수 없습니다.');
    }

    const educationOfficeCode =
      body.educationOfficeCode ?? user?.educationOfficeCode;
    const schoolCode = body.schoolCode ?? user?.schoolCode;
    const grade = body.grade ?? user?.homeroomGrade;
    const classNumber = body.classNumber ?? user?.homeroomClass;

    if (!educationOfficeCode || !schoolCode) {
      throw new BadRequestException(
        'educationOfficeCode와 schoolCode는 필수 값입니다.',
      );
    }

    if (
      grade === undefined ||
      classNumber === undefined ||
      Number.isNaN(Number(grade)) ||
      Number.isNaN(Number(classNumber))
    ) {
      throw new BadRequestException(
        'grade와 classNumber는 필수 값입니다. (담임 교사는 자동으로 채워집니다.)',
      );
    }

    const updated = await this.userService.incrementClassCoin({
      educationOfficeCode,
      schoolCode,
      grade: Number(grade),
      classNumber: Number(classNumber),
      coinDelta: body.coinDelta,
    });

    return {
      educationOfficeCode: updated.educationOfficeCode,
      schoolCode: updated.schoolCode,
      grade: updated.grade,
      classNumber: updated.classNumber,
      coinCount: updated.coinCount,
    };
  }
}
