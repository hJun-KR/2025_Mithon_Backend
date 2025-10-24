import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Teacher } from './teacher.entity';
import { SchoolClass } from './school-class.entity';

@Entity()
export class Mission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ default: false })
  isEmergency: boolean;

  @Column({ type: 'datetime', nullable: true })
  deadline?: Date;

  @ManyToOne(() => Teacher, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'teacherId' })
  teacher?: Teacher;

  @ManyToOne(() => SchoolClass, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'schoolClassId' })
  schoolClass?: SchoolClass;
}
