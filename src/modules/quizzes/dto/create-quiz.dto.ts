import { IsString, IsNotEmpty, IsEnum, IsNumber, IsBoolean, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuizType } from '../entities/quiz.entity';

export class CreateQuizDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ enum: QuizType, default: QuizType.GRADED })
    @IsEnum(QuizType)
    @IsOptional()
    type?: QuizType;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    points?: number;

    @ApiPropertyOptional({ description: 'Time limit in minutes' })
    @IsInt()
    @IsOptional()
    timeLimit?: number;

    @ApiPropertyOptional({ default: 1, description: '-1 for unlimited' })
    @IsInt()
    @IsOptional()
    allowedAttempts?: number;

    @ApiPropertyOptional({ default: false })
    @IsBoolean()
    @IsOptional()
    shuffleQuestions?: boolean;

    @ApiPropertyOptional({ default: false })
    @IsBoolean()
    @IsOptional()
    shuffleAnswers?: boolean;

    @ApiPropertyOptional({ default: false })
    @IsBoolean()
    @IsOptional()
    showCorrectAnswers?: boolean;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    dueDate?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    availableFrom?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    availableUntil?: string;

    @ApiPropertyOptional({ default: true })
    @IsBoolean()
    @IsOptional()
    published?: boolean;
}


