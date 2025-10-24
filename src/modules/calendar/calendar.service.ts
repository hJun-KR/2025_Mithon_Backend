import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarEvent, CalendarEventType } from './entities/calendar-event.entity';
import { Student } from '../user/entities/student.entity';
import { Teacher } from '../user/entities/teacher.entity';
import { SchoolClass } from '../user/entities/school-class.entity';
import { User, UserRole } from '../user/entities/user.entity';
import { CreateStudentEventDto } from './dto/create-student-event.dto';
import { CreatePersonalEventDto } from './dto/create-personal-event.dto';
import { CreateClassAssignmentDto } from './dto/create-class-assignment.dto';
import { CalendarEventResponse } from './dto/calendar-event-response.dto';
import { CreateUrgentNoticeDto } from './dto/create-urgent-notice.dto';

const STUDENT_EVENT_COLOR = '#5FEC52';
const CLASS_ASSIGNMENT_COLOR = '#D2F0FF';
const PERSONAL_EVENT_COLOR = '#FF4B4B';
const URGENT_NOTICE_COLOR = '#FF6B6B';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(CalendarEvent)
    private readonly calendarRepository: Repository<CalendarEvent>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(SchoolClass)
    private readonly schoolClassRepository: Repository<SchoolClass>,
  ) {}

  async createStudentEvent(
    user: User,
    dto: CreateStudentEventDto,
  ): Promise<CalendarEventResponse> {
    const student = await this.studentRepository.findOne({
      where: { id: user.id },
    });

    if (!student) {
      throw new BadRequestException('학생만 사용할 수 있는 기능입니다.');
    }

    const event = this.calendarRepository.create({
      title: dto.title,
      description: dto.description,
      startAt: dto.startAt,
      endAt: dto.endAt,
      color: STUDENT_EVENT_COLOR,
      type: CalendarEventType.STUDENT_DEFAULT,
      createdBy: student,
      student,
    });

    const saved = await this.calendarRepository.save(event);
    return this.toResponse(saved);
  }

  async createPersonalEvent(
    user: User,
    dto: CreatePersonalEventDto,
  ): Promise<CalendarEventResponse> {
    let student: Student | undefined;
    let teacher: Teacher | undefined;

    if (user.role === UserRole.STUDENT) {
      student = await this.studentRepository.findOne({ where: { id: user.id } });
      if (!student) {
        throw new BadRequestException('학생 정보를 찾을 수 없습니다.');
      }
    } else if (user.role === UserRole.TEACHER) {
      teacher = await this.teacherRepository.findOne({ where: { id: user.id } });
      if (!teacher) {
        throw new BadRequestException('교사 정보를 찾을 수 없습니다.');
      }
    }

    const event = this.calendarRepository.create({
      title: dto.title,
      description: dto.description,
      startAt: dto.startAt,
      endAt: dto.endAt,
      color: PERSONAL_EVENT_COLOR,
      type: CalendarEventType.PERSONAL,
      createdBy: user,
      student,
      teacher,
    });

    const saved = await this.calendarRepository.save(event);
    return this.toResponse(saved);
  }

  async createClassAssignment(
    user: User,
    dto: CreateClassAssignmentDto,
  ): Promise<CalendarEventResponse> {
    if (user.role !== UserRole.TEACHER) {
      throw new BadRequestException('교사만 사용할 수 있는 기능입니다.');
    }

    const teacher = await this.teacherRepository.findOne({
      where: { id: user.id },
    });

    if (!teacher) {
      throw new BadRequestException('교사 정보를 찾을 수 없습니다.');
    }

    const grade = dto.grade ?? teacher.homeroomGrade;
    const classNumber = dto.classNumber ?? teacher.homeroomClass;

    if (!grade || !classNumber) {
      throw new BadRequestException(
        '담당 학급 정보를 찾을 수 없습니다. grade와 classNumber를 입력해 주세요.',
      );
    }

    const schoolClass = await this.ensureSchoolClass(
      teacher.educationOfficeCode,
      teacher.schoolCode,
      grade,
      classNumber,
    );

    const event = this.calendarRepository.create({
      title: dto.title,
      description: dto.description,
      startAt: dto.dueDate,
      endAt: dto.endAt ?? dto.dueDate,
      color: CLASS_ASSIGNMENT_COLOR,
      type: CalendarEventType.CLASS_ASSIGNMENT,
      createdBy: teacher,
      teacher,
      schoolClass,
    });

    const saved = await this.calendarRepository.save(event);
    return this.toResponse(saved, {
      grade: schoolClass.grade,
      classNumber: schoolClass.classNumber,
    });
  }

  async createUrgentNotice(
    user: User,
    dto: CreateUrgentNoticeDto,
  ): Promise<CalendarEventResponse> {
    if (user.role !== UserRole.TEACHER) {
      throw new BadRequestException('교사만 사용할 수 있는 기능입니다.');
    }

    const teacher = await this.teacherRepository.findOne({
      where: { id: user.id },
    });

    if (!teacher) {
      throw new BadRequestException('교사 정보를 찾을 수 없습니다.');
    }

    const grade = dto.grade ?? teacher.homeroomGrade;
    const classNumber = dto.classNumber ?? teacher.homeroomClass;

    if (!grade || !classNumber) {
      throw new BadRequestException(
        '담당 학급 정보를 찾을 수 없습니다. grade와 classNumber를 입력해 주세요.',
      );
    }

    const schoolClass = await this.ensureSchoolClass(
      teacher.educationOfficeCode,
      teacher.schoolCode,
      grade,
      classNumber,
    );

    const event = this.calendarRepository.create({
      title: dto.title,
      description: dto.description,
      startAt: dto.startAt,
      endAt: dto.endAt ?? dto.startAt,
      color: URGENT_NOTICE_COLOR,
      type: CalendarEventType.URGENT_NOTICE,
      createdBy: teacher,
      teacher,
      schoolClass,
    });

    const saved = await this.calendarRepository.save(event);
    return this.toResponse(saved, {
      grade: schoolClass.grade,
      classNumber: schoolClass.classNumber,
    });
  }

  async getEventsForUser(user: User): Promise<CalendarEventResponse[]> {
    if (user.role === UserRole.STUDENT) {
      const student = await this.studentRepository.findOne({
        where: { id: user.id },
      });

      if (!student) {
        throw new BadRequestException('학생 정보를 찾을 수 없습니다.');
      }

      const schoolClass = await this.schoolClassRepository.findOne({
        where: {
          educationOfficeCode: student.educationOfficeCode,
          schoolCode: student.schoolCode,
          grade: student.grade,
          classNumber: student.class,
        },
      });

      const qb = this.calendarRepository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.student', 'student')
        .leftJoinAndSelect('event.teacher', 'teacher')
        .leftJoinAndSelect('event.schoolClass', 'schoolClass')
        .where('event.createdById = :userId', { userId: user.id })
        .orWhere('event.studentId = :studentId', { studentId: student.id });

      if (schoolClass) {
        qb.orWhere('event.schoolClassId = :classId', { classId: schoolClass.id });
      }

      qb.orderBy('event.startAt', 'ASC');

      const events = await qb.getMany();
      return events.map((event) =>
        this.toResponse(event, this.extractClassMeta(event)),
      );
    }

    if (user.role === UserRole.TEACHER) {
      const teacher = await this.teacherRepository.findOne({
        where: { id: user.id },
      });

      if (!teacher) {
        throw new BadRequestException('교사 정보를 찾을 수 없습니다.');
      }

      const homeroomClass =
        teacher.homeroomGrade && teacher.homeroomClass
          ? await this.schoolClassRepository.findOne({
              where: {
                educationOfficeCode: teacher.educationOfficeCode,
                schoolCode: teacher.schoolCode,
                grade: teacher.homeroomGrade,
                classNumber: teacher.homeroomClass,
              },
            })
          : undefined;

      const qb = this.calendarRepository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.student', 'student')
        .leftJoinAndSelect('event.teacher', 'teacher')
        .leftJoinAndSelect('event.schoolClass', 'schoolClass')
        .where('event.createdById = :userId', { userId: user.id })
        .orWhere('event.teacherId = :teacherId', { teacherId: teacher.id });

      if (homeroomClass) {
        qb.orWhere('event.schoolClassId = :classId', {
          classId: homeroomClass.id,
        });
      }

      qb.orderBy('event.startAt', 'ASC');

      const events = await qb.getMany();
      return events.map((event) =>
        this.toResponse(event, this.extractClassMeta(event)),
      );
    }

    throw new InternalServerErrorException(
      '지원하지 않는 사용자 역할입니다.',
    );
  }

  private toResponse(
    event: CalendarEvent,
    metadata: Record<string, unknown> = {},
  ): CalendarEventResponse {
    return {
      id: event.id,
      title: event.title,
      description: event.description ?? undefined,
      startAt: event.startAt,
      endAt: event.endAt ?? undefined,
      color: event.color,
      type: event.type,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    } as CalendarEventResponse;
  }

  private extractClassMeta(
    event: CalendarEvent,
  ): Record<string, unknown> | undefined {
    if (event.schoolClass) {
      return {
        grade: event.schoolClass.grade,
        classNumber: event.schoolClass.classNumber,
      };
    }
    return undefined;
  }

  private async ensureSchoolClass(
    educationOfficeCode: string,
    schoolCode: string,
    grade: number,
    classNumber: number,
  ): Promise<SchoolClass> {
    let schoolClass = await this.schoolClassRepository.findOne({
      where: {
        educationOfficeCode,
        schoolCode,
        grade,
        classNumber,
      },
    });

    if (!schoolClass) {
      schoolClass = this.schoolClassRepository.create({
        educationOfficeCode,
        schoolCode,
        grade,
        classNumber,
        coinCount: 0,
      });
      schoolClass = await this.schoolClassRepository.save(schoolClass);
    }

    return schoolClass;
  }
}
