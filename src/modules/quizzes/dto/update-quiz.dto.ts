import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateQuizDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  points?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  timeLimit?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  allowedAttempts?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  shuffleQuestions?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  shuffleAnswers?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showCorrectAnswers?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  published?: boolean;
}