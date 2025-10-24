import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Student } from './student.entity';
import { Mission } from './mission.entity';
import { SchoolClass } from './school-class.entity';
import { Teacher } from './teacher.entity';

export enum MissionType {
  REGULAR = 'regular',
  EMERGENCY = 'emergency',
}

@Entity()
@Index(['student', 'date'])
@Index(['schoolClass', 'date'])
export class StudentMissionLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  student: Student;

  @ManyToOne(() => Mission, { nullable: true })
  mission?: Mission;

  @ManyToOne(() => SchoolClass, (schoolClass) => schoolClass.missionLogs, {
    onDelete: 'CASCADE',
  })
  schoolClass: SchoolClass;

  @ManyToOne(() => Teacher, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approvedById' })
  approvedBy?: Teacher;

  @Column({ type: 'text' })
  missionType: MissionType;

  @Column({ type: 'real', default: 0 })
  coinDelta: number;

  @Column()
  date: string;

  @Column({ type: 'text', default: 'pending' })
  status: 'pending' | 'approved' | 'rejected';

  @Column({ type: 'datetime', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @CreateDateColumn()
  createdAt: Date;
}
