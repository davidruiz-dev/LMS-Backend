import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { ModuleItemType } from "src/modules/modules/entities/module-item.entity";

export class UpdateModuleItemDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ enum: ModuleItemType })
  @IsEnum(ModuleItemType)
  @IsOptional()
  type?: ModuleItemType;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  contentId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  published?: boolean;
}