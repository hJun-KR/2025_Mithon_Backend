import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Student } from './student.entity';
import { Mission } from './mission.entity';

@Entity()
export class StudentMission {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Student, (student) => student.missionStats)
  student: Student;

  @ManyToOne(() => Mission)
  mission: Mission;

  @Column({ default: 0 })
  count: number;
}
