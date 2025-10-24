import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { Student } from './entities/student.entity';
import { Teacher } from './entities/teacher.entity';
import { Mission } from './entities/mission.entity';
import { StudentMission } from './entities/student-mission.entity';
import { StudentMissionLog } from './entities/student-mission-log.entity';
import { User } from './entities/user.entity';
import { SchoolClass } from './entities/school-class.entity';
import { ClassDailyMission } from './entities/class-daily-mission.entity';
import { NeisService } from './neis.service';
import { NeisController } from './neis.controller';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      User,
      Student,
      Teacher,
      Mission,
      StudentMission,
      StudentMissionLog,
      SchoolClass,
      ClassDailyMission,
    ]),
  ],
  controllers: [UserController, NeisController],
  providers: [UserService, NeisService],
  exports: [UserService, NeisService, TypeOrmModule],
})
export class UserModule {}
