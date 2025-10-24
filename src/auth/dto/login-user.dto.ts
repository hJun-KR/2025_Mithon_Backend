import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({ description: '사용자 아이디', example: 's20250001' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: '사용자 비밀번호', example: 'Str0ng!Pass1' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
