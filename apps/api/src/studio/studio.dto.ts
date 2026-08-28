import { ArrayUnique, IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePassDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  addonIds!: string[];
}

export class CheckInDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  passId?: string;
}

export class StaffCheckInDto {
  @ApiProperty()
  @IsString()
  codeOrUrl!: string;
}

export class StudioDayDto {
  @ApiProperty()
  @IsString()
  date!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(80)
  capacity!: number;

  @ApiProperty()
  @IsBoolean()
  open!: boolean;
}

export class PatchStudioDayDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  open?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(80)
  capacity?: number;
}

export class ReviewDto {
  @ApiProperty()
  @IsString()
  pressId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty()
  @IsString()
  body!: string;
}
