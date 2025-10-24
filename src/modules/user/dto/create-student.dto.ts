import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class CreateStudentDto extends CreateUserDto {
  @ApiProperty({ description: '학년', example: 2 })
  @IsNumber()
  @IsNotEmpty()
  grade: number;

  @ApiProperty({ description: '반', example: 3 })
  @IsNumber()
  @IsNotEmpty()
  class: number;

  @ApiProperty({ description: '학생 번호', example: 17 })
  @IsNumber()
  @IsNotEmpty()
  studentNumber: number;
}
