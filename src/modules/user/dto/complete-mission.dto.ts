import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { MissionType } from '../entities/student-mission-log.entity';

export class CompleteMissionDto {
  @ApiProperty({ description: '완료할 미션 ID', example: 15 })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  missionId: number;

  @ApiProperty({ enum: MissionType, description: '미션 유형' })
  @IsEnum(MissionType)
  missionType: MissionType;

  @ApiPropertyOptional({ description: '완료 날짜(YYYYMMDD)', example: '20250305' })
  @IsOptional()
  @IsString()
  date?: string;
}
