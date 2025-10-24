import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateStudentEventDto {
  @ApiProperty({ description: '일정 제목', example: '과학 프로젝트 준비' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({ description: '일정 설명', example: '7교시 이후 과학실 모임' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: '시작 일시', example: '2025-03-05T09:00:00Z' })
  @Type(() => Date)
  @IsDate()
  startAt: Date;

  @ApiPropertyOptional({ description: '종료 일시', example: '2025-03-05T10:00:00Z' })
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  endAt?: Date;
}
