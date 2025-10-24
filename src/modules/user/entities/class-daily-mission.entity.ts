import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { SchoolClass } from './school-class.entity';

@Entity()
@Unique(['schoolClass', 'date'])
export class ClassDailyMission {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SchoolClass, (schoolClass) => schoolClass.dailyMissions, {
    onDelete: 'CASCADE',
  })
  schoolClass: SchoolClass;

  @Column()
  date: string;

  @Column({ default: false })
  bonusAwarded: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
