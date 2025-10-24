import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  TableInheritance,
} from 'typeorm';

export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
}

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'role' } })
export abstract class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  role: UserRole;

  @Column()
  name: string;

  @Column({ unique: true })
  userId: string;

  @Column()
  school: string;

  @Column()
  educationOfficeCode: string;

  @Column()
  schoolCode: string;

  @Column({ select: false })
  password?: string;

  @CreateDateColumn()
  createdAt: Date;
}
