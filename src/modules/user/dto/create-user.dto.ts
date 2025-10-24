import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsStrongPassword,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ enum: UserRole, description: '사용자 역할' })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiProperty({ description: '이름', example: '홍길동' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '로그인에 사용할 아이디', example: 's20250001' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: '학교명', example: '미톤고등학교' })
  @IsString()
  @IsNotEmpty()
  school: string;

  @ApiProperty({ description: '교육청 코드', example: 'J10' })
  @IsString()
  @IsNotEmpty()
  educationOfficeCode: string;

  @ApiProperty({ description: '학교 코드', example: '7530076' })
  @IsString()
  @IsNotEmpty()
  schoolCode: string;

  @ApiProperty({ description: '로그인 비밀번호(강력)', example: 'Str0ng!Pass1' })
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  password: string;
}
