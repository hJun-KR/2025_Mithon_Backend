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

export class CreateUrgentNoticeDto {
  @ApiProperty({ description: '공지 제목', example: '긴급 안전 점검 안내' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({ description: '공지 내용', example: '즉시 체육관으로 이동하세요' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: '공지 시작 일시', example: '2025-03-04T09:00:00Z' })
  @Type(() => Date)
  @IsDate()
  startAt: Date;

  @ApiPropertyOptional({ description: '공지 종료 일시', example: '2025-03-04T12:00:00Z' })
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
