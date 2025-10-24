import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Student } from '../../user/entities/student.entity';
import { Teacher } from '../../user/entities/teacher.entity';
import { SchoolClass } from '../../user/entities/school-class.entity';
import { User } from '../../user/entities/user.entity';

export enum CalendarEventType {
  STUDENT_DEFAULT = 'student_default',
  CLASS_ASSIGNMENT = 'class_assignment',
  PERSONAL = 'personal',
  URGENT_NOTICE = 'urgent_notice',
}

@Entity()
export class CalendarEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'datetime' })
  startAt: Date;

  @Column({ type: 'datetime', nullable: true })
  endAt?: Date;

  @Column()
  color: string;

  @Column({ type: 'text', enum: CalendarEventType })
  type: CalendarEventType;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @ManyToOne(() => Student, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student?: Student;

  @ManyToOne(() => Teacher, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher?: Teacher;

  @ManyToOne(() => SchoolClass, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schoolClassId' })
  schoolClass?: SchoolClass;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
