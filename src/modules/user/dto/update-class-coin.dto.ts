import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateClassCoinDto {
  @ApiPropertyOptional({ description: '교육청 코드', example: 'J10' })
  @IsString()
  @IsOptional()
  educationOfficeCode?: string;

  @ApiPropertyOptional({ description: '학교 코드', example: '7530076' })
  @IsString()
  @IsOptional()
  schoolCode?: string;

  @ApiPropertyOptional({ description: '학년', example: 2 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  grade?: number;

  @ApiPropertyOptional({ description: '반', example: 3 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  classNumber?: number;

  @ApiProperty({ description: '증가시킬 코인 값', example: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  coinDelta: number;
}
