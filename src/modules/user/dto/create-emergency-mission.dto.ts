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

export class CreateEmergencyMissionDto {
  @ApiProperty({ description: '긴급 미션 제목', example: '긴급 대청소' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiProperty({ description: '긴급 미션 설명', example: '오늘 하교 전까지 교실 정리' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ description: '마감 기한', example: '2025-03-05T12:00:00Z' })
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  deadline?: Date;

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
