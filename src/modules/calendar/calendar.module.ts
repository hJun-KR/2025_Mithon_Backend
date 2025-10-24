import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarEvent } from './entities/calendar-event.entity';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { Student } from '../user/entities/student.entity';
import { Teacher } from '../user/entities/teacher.entity';
import { SchoolClass } from '../user/entities/school-class.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CalendarEvent, Student, Teacher, SchoolClass]),
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
