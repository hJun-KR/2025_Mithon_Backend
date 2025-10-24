import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class CreateTeacherDto extends CreateUserDto {
  @ApiProperty({ description: '담당 과목', example: '수학' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional({ description: '담임 학년', example: 1 })
  @IsNumber()
  @IsOptional()
  homeroomGrade?: number;

  @ApiPropertyOptional({ description: '담임 반', example: 4 })
  @IsNumber()
  @IsOptional()
  homeroomClass?: number;
}
