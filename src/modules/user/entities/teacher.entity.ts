import { ChildEntity, Column } from 'typeorm';
import { User } from './user.entity';

@ChildEntity('teacher')
export class Teacher extends User {
  @Column()
  subject: string;

  @Column({ nullable: true })
  homeroomGrade?: number;

  @Column({ nullable: true })
  homeroomClass?: number;
}
