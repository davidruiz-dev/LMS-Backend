import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsInt, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModuleItemType } from 'src/modules/modules/entities/module-item.entity';

export class CreateModuleItemDto {
  @ApiProperty({ example: 'Introduction to Programming' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ enum: ModuleItemType })
  @IsEnum(ModuleItemType)
  type: ModuleItemType;

  @ApiPropertyOptional({ example: 'uuid-of-assignment' })
  @IsUUID()
  @IsOptional()
  contentId?: string;

  @ApiPropertyOptional({ example: 'Lesson content here...' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  published?: boolean;
}