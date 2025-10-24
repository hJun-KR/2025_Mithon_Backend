import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateClassAssignmentDto {
  @ApiProperty({ description: '과제 제목', example: '영어 발표 준비' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({ description: '과제 설명', example: 'PPT 완성 및 리허설' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: '마감 일시', example: '2025-03-07T23:59:59Z' })
  @Type(() => Date)
  @IsDate()
  dueDate: Date;

  @ApiPropertyOptional({ description: '표시할 종료 일시', example: '2025-03-07T23:59:59Z' })
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  endAt?: Date;

  @ApiPropertyOptional({ description: '대상 학년(기본은 담임반)', example: 2 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  grade?: number;

  @ApiPropertyOptional({ description: '대상 반(기본은 담임반)', example: 3 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  classNumber?: number;
}
