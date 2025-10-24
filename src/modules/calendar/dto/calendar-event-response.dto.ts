import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CalendarEventType } from '../entities/calendar-event.entity';

export class CalendarEventResponse {
  @ApiProperty({ description: '이벤트 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '이벤트 제목', example: '교실 대청소' })
  title: string;

  @ApiPropertyOptional({ description: '이벤트 설명', example: '15시까지 완료' })
  description?: string;

  @ApiProperty({ description: '시작 일시', example: '2025-03-05T09:00:00.000Z' })
  startAt: Date;

  @ApiPropertyOptional({ description: '종료 일시', example: '2025-03-05T10:00:00.000Z' })
  endAt?: Date;

  @ApiProperty({ description: '표시 색상', example: '#5FEC52' })
  color: string;

  @ApiProperty({ enum: CalendarEventType, description: '이벤트 유형' })
  type: CalendarEventType;

  @ApiPropertyOptional({ description: '추가 메타데이터' })
  metadata?: Record<string, unknown>;
}
