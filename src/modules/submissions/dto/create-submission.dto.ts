import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSubmissionDto {
    courseId: string;
    
    @IsUUID()
    assignmentId: string;

    @IsOptional()
    @IsString()
    content?: string;
}