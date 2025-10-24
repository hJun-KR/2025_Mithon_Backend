import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewMissionSubmissionDto {
  @ApiProperty({ enum: ['approve', 'reject'], description: '승인 여부' })
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ApiPropertyOptional({ description: '거절 사유', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
