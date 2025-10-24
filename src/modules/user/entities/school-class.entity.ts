import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ClassDailyMission } from './class-daily-mission.entity';
import { StudentMissionLog } from './student-mission-log.entity';

@Entity()
@Unique(['educationOfficeCode', 'schoolCode', 'grade', 'classNumber'])
export class SchoolClass {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  educationOfficeCode: string;

  @Column()
  schoolCode: string;

  @Column()
  grade: number;

  @Column()
  classNumber: number;

  @Column({ type: 'real', default: 0 })
  coinCount: number;

  @OneToMany(
    () => ClassDailyMission,
    (classDailyMission) => classDailyMission.schoolClass,
  )
  dailyMissions: ClassDailyMission[];

  @OneToMany(() => StudentMissionLog, (log) => log.schoolClass)
  missionLogs: StudentMissionLog[];
}
