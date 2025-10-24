import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  OnModuleInit,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User, UserRole } from './entities/user.entity';
import { Student } from './entities/student.entity';
import { Teacher } from './entities/teacher.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { NeisService } from './neis.service';
import { SchoolClass } from './entities/school-class.entity';
import { Mission } from './entities/mission.entity';
import { StudentMission } from './entities/student-mission.entity';
import {
  MissionType,
  StudentMissionLog,
} from './entities/student-mission-log.entity';
import { ClassDailyMission } from './entities/class-daily-mission.entity';
import { CompleteMissionDto } from './dto/complete-mission.dto';
import { CreateEmergencyMissionDto } from './dto/create-emergency-mission.dto';
import { ReviewMissionSubmissionDto } from './dto/review-mission-submission.dto';

const DEFAULT_MISSIONS: Array<{ title: string; description: string }> = [
  { title: '교복 등교', description: '교복 잘 입고 등교' },
  { title: '수행준비', description: '영어 PPT 발표 준비' },
  { title: '수행준비', description: '수학 포트폴리오 준비' },
  { title: '인사하기', description: '밝게 인사하기' },
  { title: '일찍등교', description: '지각하지 않기' },
  { title: '노트정리', description: '배운 내용 정리' },
  { title: '친구돕기', description: '친구 도와주기' },
  { title: '과제완료', description: '국어 과제 제출하기' },
  { title: '자리정돈', description: '책상 깨끗이 하기' },
  { title: '실내화신기', description: '실습실 실내화 착용' },
];

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(SchoolClass)
    private readonly schoolClassRepository: Repository<SchoolClass>,
    @InjectRepository(Mission)
    private readonly missionRepository: Repository<Mission>,
    @InjectRepository(StudentMission)
    private readonly studentMissionRepository: Repository<StudentMission>,
    @InjectRepository(StudentMissionLog)
    private readonly studentMissionLogRepository: Repository<StudentMissionLog>,
    @InjectRepository(ClassDailyMission)
    private readonly classDailyMissionRepository: Repository<ClassDailyMission>,
    private readonly neisService: NeisService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureDefaultMissions();
  }

  async register(
    createUserDto: CreateStudentDto | CreateTeacherDto,
  ): Promise<User> {
    const { schoolName } = await this.neisService.validateSchool(
      createUserDto.educationOfficeCode,
      createUserDto.schoolCode,
    );

    const normalize = (value: string) => value.replace(/\s+/g, '').toLowerCase();
    if (normalize(createUserDto.school) !== normalize(schoolName)) {
      throw new BadRequestException('학교명과 교육청 코드/학교 코드가 일치하지 않습니다.');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    let userToSave: Student | Teacher;

    if (createUserDto.role === UserRole.STUDENT) {
      const studentDto = createUserDto as CreateStudentDto;
      await this.ensureSchoolClass(
        studentDto.educationOfficeCode,
        studentDto.schoolCode,
        studentDto.grade,
        studentDto.class,
      );
      userToSave = this.studentRepository.create({
        ...studentDto,
        school: schoolName,
        password: hashedPassword,
      });
    } else if (createUserDto.role === UserRole.TEACHER) {
      const teacherDto = createUserDto as CreateTeacherDto;

      if (
        teacherDto.homeroomGrade !== undefined &&
        teacherDto.homeroomClass !== undefined
      ) {
        await this.ensureSchoolClass(
          teacherDto.educationOfficeCode,
          teacherDto.schoolCode,
          teacherDto.homeroomGrade,
          teacherDto.homeroomClass,
        );
      }

      userToSave = this.teacherRepository.create({
        ...teacherDto,
        school: schoolName,
        password: hashedPassword,
      });
    } else {
      throw new BadRequestException('잘못된 사용자 역할입니다.');
    }

    try {
      if (userToSave instanceof Student) {
        return await this.studentRepository.save(userToSave);
      } else {
        return await this.teacherRepository.save(userToSave as Teacher);
      }
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT' || error.code === '23505') {
        throw new ConflictException('이미 존재하는 id입니다.');
      }
      console.error('서버 오류:', error);
      throw new InternalServerErrorException(
        '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.',
      );
    }
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async isUserIdAvailable(userId: string): Promise<boolean> {
    const existingUser = await this.userRepository.findOne({
      where: { userId },
    });
    return !existingUser;
  }

  async completeMission(
    studentId: number,
    dto: CompleteMissionDto,
  ): Promise<{
    coinDelta: number;
    totalCoin: number;
    level: number;
    image: string;
    dailyRegularCoin: number;
    bonusGranted: boolean;
    status: 'pending' | 'approved' | 'rejected';
    logId: number;
  }> {
    const student = await this.studentRepository.findOne({
      where: { id: studentId },
    });

    if (!student) {
      throw new BadRequestException('학생 정보를 찾을 수 없습니다.');
    }

    const mission = await this.missionRepository.findOne({
      where: { id: dto.missionId },
      relations: ['schoolClass'],
    });

    if (!mission) {
      throw new BadRequestException('존재하지 않는 미션입니다.');
    }

    if (dto.missionType === MissionType.REGULAR && mission.isEmergency) {
      throw new BadRequestException('긴급 미션은 regular 유형으로 완료할 수 없습니다.');
    }

    if (dto.missionType === MissionType.EMERGENCY && !mission.isEmergency) {
      throw new BadRequestException('일반 미션은 emergency 유형으로 완료할 수 없습니다.');
    }

    const schoolClass = await this.ensureSchoolClass(
      student.educationOfficeCode,
      student.schoolCode,
      student.grade,
      student.class,
    );

    const date = this.ensureDate(dto.date);

    let coinDelta = 0;
    let dailyRegularCoinBefore = 0;

    if (dto.missionType === MissionType.REGULAR) {
      dailyRegularCoinBefore = await this.getStudentDailyRegularCoin(
        student.id,
        date,
      );
      if (dailyRegularCoinBefore < 2) {
        const remaining = 2 - dailyRegularCoinBefore;
        coinDelta = Math.min(0.5, remaining);
      }
    } else if (dto.missionType === MissionType.EMERGENCY) {
      coinDelta = 3;
    } else {
      throw new BadRequestException('지원하지 않는 미션 유형입니다.');
    }

    const status: 'pending' | 'approved' = coinDelta > 0 ? 'pending' : 'approved';

    const missionLog = this.studentMissionLogRepository.create({
      student,
      schoolClass,
      mission,
      missionType: dto.missionType,
      coinDelta,
      date,
      status,
    });

    if (status === 'approved') {
      missionLog.approvedAt = new Date();
    }
    await this.studentMissionLogRepository.save(missionLog);

    let bonusGranted = false;

    const { level, fileName } = this.resolveCharacterByCoin(
      schoolClass.coinCount,
    );

    const dailyRegularCoinAfter =
      dto.missionType === MissionType.REGULAR
        ? Math.min(2, this.roundCoin(dailyRegularCoinBefore + coinDelta))
        : dailyRegularCoinBefore;

    return {
      coinDelta,
      totalCoin: schoolClass.coinCount,
      level,
      image: `/static/images/${fileName}`,
      dailyRegularCoin: dailyRegularCoinAfter,
      bonusGranted,
      status,
      logId: missionLog.id,
    };
  }

  async getClassCharacter(params: {
    educationOfficeCode: string;
    schoolCode: string;
    grade: number;
    classNumber: number;
  }): Promise<{
    coinCount: number;
    level: number;
    image: string;
  }> {
    const schoolClass = await this.findOrCreateClass(params);

    const { level, fileName } = this.resolveCharacterByCoin(schoolClass.coinCount);
    return {
      coinCount: schoolClass.coinCount,
      level,
      image: `/static/images/${fileName}`,
    };
  }

  async incrementClassCoin(params: {
    educationOfficeCode: string;
    schoolCode: string;
    grade: number;
    classNumber: number;
    coinDelta: number;
  }): Promise<SchoolClass> {
    if (params.coinDelta < 0) {
      throw new BadRequestException('coinDelta는 0 이상이어야 합니다.');
    }

    const schoolClass = await this.findOrCreateClass(params);

    if (params.coinDelta > 0) {
      schoolClass.coinCount = this.roundCoin(
        schoolClass.coinCount + params.coinDelta,
      );
      await this.schoolClassRepository.save(schoolClass);
    }

    return schoolClass;
  }

  async createEmergencyMission(
    user: User,
    dto: CreateEmergencyMissionDto,
  ): Promise<Mission> {
    if (user.role !== UserRole.TEACHER) {
      throw new BadRequestException('교사만 긴급 미션을 등록할 수 있습니다.');
    }

    const teacher = await this.teacherRepository.findOne({
      where: { id: user.id },
    });

    if (!teacher) {
      throw new BadRequestException('교사 정보를 찾을 수 없습니다.');
    }

    const grade = dto.grade ?? teacher.homeroomGrade;
    const classNumber = dto.classNumber ?? teacher.homeroomClass;

    let schoolClass: SchoolClass | undefined;

    if (grade && classNumber) {
      schoolClass = await this.ensureSchoolClass(
        teacher.educationOfficeCode,
        teacher.schoolCode,
        grade,
        classNumber,
      );
    }

    const mission = this.missionRepository.create({
      title: dto.title,
      description: dto.description,
      deadline: dto.deadline,
      isEmergency: true,
      teacher,
      schoolClass,
    });

    return this.missionRepository.save(mission);
  }

  async getEmergencyMissionsForUser(user: User): Promise<Mission[]> {
    if (user.role === UserRole.TEACHER) {
      const teacher = await this.teacherRepository.findOne({
        where: { id: user.id },
      });

      if (!teacher) {
        throw new BadRequestException('교사 정보를 찾을 수 없습니다.');
      }

      return this.missionRepository.find({
        where: { isEmergency: true, teacher: { id: teacher.id } },
        relations: ['schoolClass', 'teacher'],
        order: { deadline: 'ASC' },
      });
    }

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

      const qb = this.missionRepository
        .createQueryBuilder('mission')
        .leftJoinAndSelect('mission.schoolClass', 'schoolClass')
        .leftJoinAndSelect('mission.teacher', 'teacher')
        .where('mission.isEmergency = :isEmergency', { isEmergency: true });

      if (schoolClass) {
        qb.andWhere(
          '(mission.schoolClassId IS NULL OR mission.schoolClassId = :classId)',
          { classId: schoolClass.id },
        );
      } else {
        qb.andWhere('mission.schoolClassId IS NULL');
      }

      qb
        .orderBy('mission.deadline IS NULL', 'ASC')
        .addOrderBy('mission.deadline', 'ASC');

      return qb.getMany();
    }

    throw new BadRequestException('지원하지 않는 사용자 역할입니다.');
  }

  async getPendingMissionLogsForTeacher(user: User) {
    if (user.role !== UserRole.TEACHER) {
      throw new BadRequestException('교사만 사용할 수 있는 기능입니다.');
    }

    const teacher = await this.teacherRepository.findOne({
      where: { id: user.id },
    });

    if (!teacher) {
      throw new BadRequestException('교사 정보를 찾을 수 없습니다.');
    }

    let homeroomClassId: number | null = null;

    if (
      teacher.homeroomGrade !== undefined &&
      teacher.homeroomClass !== undefined
    ) {
      const homeroomClass = await this.ensureSchoolClass(
        teacher.educationOfficeCode,
        teacher.schoolCode,
        teacher.homeroomGrade,
        teacher.homeroomClass,
      );
      homeroomClassId = homeroomClass.id;
    }

    const qb = this.studentMissionLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.student', 'student')
      .leftJoinAndSelect('log.mission', 'mission')
      .leftJoinAndSelect('mission.teacher', 'missionTeacher')
      .leftJoinAndSelect('log.schoolClass', 'schoolClass')
      .where('log.status = :status', { status: 'pending' })
      .andWhere('log.coinDelta > 0')
      .andWhere(
        new Brackets((inner) => {
          if (homeroomClassId !== null) {
            inner.where('log.schoolClassId = :classId', {
              classId: homeroomClassId,
            });
            inner.orWhere('missionTeacher.id = :teacherId', {
              teacherId: teacher.id,
            });
          } else {
            inner.where('missionTeacher.id = :teacherId', {
              teacherId: teacher.id,
            });
          }
        }),
      )
      .orderBy('log.createdAt', 'DESC');

    return qb.getMany();
  }

  async reviewMissionSubmission(
    logId: number,
    user: User,
    dto: ReviewMissionSubmissionDto,
  ): Promise<{
    status: 'approved' | 'rejected';
    coinDelta: number;
    totalCoin: number;
    level: number;
    image: string;
    bonusGranted: boolean;
    rejectionReason?: string | null;
  }> {
    if (user.role !== UserRole.TEACHER) {
      throw new BadRequestException('교사만 사용할 수 있는 기능입니다.');
    }

    const teacher = await this.teacherRepository.findOne({
      where: { id: user.id },
    });

    if (!teacher) {
      throw new BadRequestException('교사 정보를 찾을 수 없습니다.');
    }

    const missionLog = await this.studentMissionLogRepository.findOne({
      where: { id: logId },
      relations: ['student', 'mission', 'mission.teacher', 'schoolClass'],
    });

    if (!missionLog) {
      throw new BadRequestException('미션 제출 정보를 찾을 수 없습니다.');
    }

    if (missionLog.status !== 'pending') {
      throw new BadRequestException('이미 처리된 미션입니다.');
    }

    const isHomeroomTeacher =
      missionLog.schoolClass !== undefined &&
      teacher.educationOfficeCode === missionLog.schoolClass.educationOfficeCode &&
      teacher.schoolCode === missionLog.schoolClass.schoolCode &&
      teacher.homeroomGrade === missionLog.schoolClass.grade &&
      teacher.homeroomClass === missionLog.schoolClass.classNumber;

    const isMissionOwner = missionLog.mission?.teacher?.id === teacher.id;

    if (!isHomeroomTeacher && !isMissionOwner) {
      throw new ForbiddenException('해당 미션을 처리할 권한이 없습니다.');
    }

    let bonusGranted = false;

    if (dto.action === 'approve') {
      missionLog.status = 'approved';
      missionLog.approvedBy = teacher;
      missionLog.approvedAt = new Date();
      missionLog.rejectionReason = null;

      if (missionLog.coinDelta > 0 && missionLog.schoolClass) {
        missionLog.schoolClass.coinCount = this.roundCoin(
          missionLog.schoolClass.coinCount + missionLog.coinDelta,
        );
        await this.schoolClassRepository.save(missionLog.schoolClass);
      }

      if (missionLog.coinDelta > 0 && missionLog.mission) {
        await this.incrementStudentMissionCount(
          missionLog.student,
          missionLog.mission,
        );
      }

      if (missionLog.coinDelta > 0 && missionLog.schoolClass) {
        bonusGranted = await this.awardClassBonusIfEligible(
          missionLog.schoolClass,
          missionLog.date,
        );
      }
    } else {
      missionLog.status = 'rejected';
      missionLog.approvedBy = teacher;
      missionLog.approvedAt = new Date();
      missionLog.rejectionReason = dto.rejectionReason ?? null;
    }

    await this.studentMissionLogRepository.save(missionLog);

    const schoolClass = missionLog.schoolClass
      ? await this.schoolClassRepository.findOne({
          where: { id: missionLog.schoolClass.id },
        })
      : undefined;

    const coinTotal = schoolClass ? schoolClass.coinCount : 0;
    const { level, fileName } = this.resolveCharacterByCoin(coinTotal);

    return {
      status: missionLog.status,
      coinDelta: missionLog.coinDelta,
      totalCoin: coinTotal,
      level,
      image: `/static/images/${fileName}`,
      bonusGranted,
      rejectionReason: missionLog.rejectionReason ?? null,
    };
  }

  async getDailyMissions(): Promise<Mission[]> {
    await this.ensureDefaultMissions();
    const missions = await this.missionRepository.find({
      where: { isEmergency: false },
    });
    if (missions.length <= 2) {
      return missions;
    }

    const shuffled = [...missions];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, 2);
  }

  private async getStudentDailyRegularCoin(
    studentId: number,
    date: string,
  ): Promise<number> {
    const { total } = await this.studentMissionLogRepository
      .createQueryBuilder('log')
      .select('COALESCE(SUM(log.coinDelta), 0)', 'total')
      .where('log.studentId = :studentId', { studentId })
      .andWhere('log.date = :date', { date })
      .andWhere('log.missionType = :type', {
        type: MissionType.REGULAR,
      })
      .andWhere('log.status IN (:...statuses)', {
        statuses: ['pending', 'approved'],
      })
      .getRawOne<{ total: string }>();

    return this.roundCoin(Number(total ?? 0));
  }

  private async incrementStudentMissionCount(
    student: Student,
    mission: Mission,
  ): Promise<void> {
    let missionStat = await this.studentMissionRepository.findOne({
      where: {
        student: { id: student.id },
        mission: { id: mission.id },
      },
      relations: ['student', 'mission'],
    });

    if (!missionStat) {
      missionStat = this.studentMissionRepository.create({
        student,
        mission,
        count: 0,
      });
    }

    missionStat.count += 1;
    await this.studentMissionRepository.save(missionStat);
  }

  private async awardClassBonusIfEligible(
    schoolClass: SchoolClass,
    date: string,
  ): Promise<boolean> {
    let dailyRecord = await this.classDailyMissionRepository.findOne({
      where: {
        schoolClass: { id: schoolClass.id },
        date,
      },
      relations: ['schoolClass'],
    });

    if (!dailyRecord) {
      dailyRecord = await this.classDailyMissionRepository.save(
        this.classDailyMissionRepository.create({
          schoolClass,
          date,
          bonusAwarded: false,
        }),
      );
    }

    if (dailyRecord.bonusAwarded) {
      return false;
    }

    const totalStudents = await this.studentRepository.count({
      where: {
        educationOfficeCode: schoolClass.educationOfficeCode,
        schoolCode: schoolClass.schoolCode,
        grade: schoolClass.grade,
        class: schoolClass.classNumber,
      },
    });

    if (totalStudents === 0) {
      return false;
    }

    const { count } = await this.studentMissionLogRepository
      .createQueryBuilder('log')
      .select('COUNT(DISTINCT log.studentId)', 'count')
      .where('log.schoolClassId = :classId', { classId: schoolClass.id })
      .andWhere('log.date = :date', { date })
      .andWhere('log.status = :status', { status: 'approved' })
      .andWhere('log.coinDelta > 0')
      .getRawOne<{ count: string }>();

    const completedCount = Number(count ?? 0);

    if (completedCount >= totalStudents) {
      schoolClass.coinCount = this.roundCoin(schoolClass.coinCount + 2);
      await this.schoolClassRepository.save(schoolClass);

      dailyRecord.bonusAwarded = true;
      await this.classDailyMissionRepository.save(dailyRecord);
      return true;
    }

    return false;
  }

  private async ensureSchoolClass(
    educationOfficeCode: string,
    schoolCode: string,
    grade: number,
    classNumber: number,
  ): Promise<SchoolClass> {
    return this.findOrCreateClass({
      educationOfficeCode,
      schoolCode,
      grade,
      classNumber,
    });
  }

  private async findOrCreateClass(params: {
    educationOfficeCode: string;
    schoolCode: string;
    grade: number;
    classNumber: number;
  }): Promise<SchoolClass> {
    const existing = await this.schoolClassRepository.findOne({
      where: {
        educationOfficeCode: params.educationOfficeCode,
        schoolCode: params.schoolCode,
        grade: params.grade,
        classNumber: params.classNumber,
      },
    });

    if (existing) {
      return existing;
    }

    const created = this.schoolClassRepository.create({
      educationOfficeCode: params.educationOfficeCode,
      schoolCode: params.schoolCode,
      grade: params.grade,
      classNumber: params.classNumber,
      coinCount: 0,
    });
    return this.schoolClassRepository.save(created);
  }

  private async ensureDefaultMissions(): Promise<void> {
    for (const mission of DEFAULT_MISSIONS) {
      const existing = await this.missionRepository.findOne({
        where: {
          title: mission.title,
          description: mission.description,
          isEmergency: false,
        },
      });

      if (!existing) {
        await this.missionRepository.save(
          this.missionRepository.create({ ...mission, isEmergency: false }),
        );
      }
    }
  }

  private resolveCharacterByCoin(coinCount: number): {
    level: number;
    fileName: string;
  } {
    if (coinCount >= 2000) {
      return { level: 6, fileName: '6.svg' };
    }
    if (coinCount >= 1500) {
      return { level: 5, fileName: '5.svg' };
    }
    if (coinCount >= 1200) {
      return { level: 4, fileName: '4.svg' };
    }
    if (coinCount >= 600) {
      return { level: 3, fileName: '3.svg' };
    }
    if (coinCount >= 300) {
      return { level: 2, fileName: '2.svg' };
    }
    if (coinCount >= 150) {
      return { level: 1, fileName: '1.svg' };
    }
    return { level: 0, fileName: '1.svg' };
  }

  private ensureDate(date?: string): string {
    if (date && /^\d{8}$/.test(date)) {
      return date;
    }
    return this.formatDate(new Date());
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private roundCoin(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
