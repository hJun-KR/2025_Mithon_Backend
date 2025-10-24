import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePersonalEventDto {
  @ApiProperty({ description: '일정 제목', example: '병원 예약' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({ description: '일정 설명', example: '오후 2시 치과' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: '시작 일시', example: '2025-03-04T14:00:00Z' })
  @Type(() => Date)
  @IsDate()
  startAt: Date;

  @ApiPropertyOptional({ description: '종료 일시', example: '2025-03-04T15:00:00Z' })
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  endAt?: Date;
}
