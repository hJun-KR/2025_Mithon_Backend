import { ChildEntity, Column, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { StudentMission } from './student-mission.entity';

@ChildEntity('student')
export class Student extends User {
  @Column()
  grade: number;

  @Column()
  class: number;

  @Column()
  studentNumber: number;

  @OneToMany(() => StudentMission, (studentMission) => studentMission.student)
  missionStats: StudentMission[];
}
