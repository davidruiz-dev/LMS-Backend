import { IsNotEmpty, IsOptional } from "class-validator"
import { CourseStatus } from "src/modules/courses/entities/course.entity"
import { User } from "src/modules/users/entities/user.entity"

export class CreateCourseDto {
    @IsNotEmpty()
    name: string
    @IsNotEmpty()
    description: string
    @IsNotEmpty()
    startDate: Date
    @IsNotEmpty()
    endDate: Date
    gradeLevelId: string
    @IsOptional()
    imageUrl?: string
    @IsOptional()
    imagePublicId?: string
    @IsNotEmpty()
    instructor: User
    instructorId: string;
    @IsOptional()
    status: CourseStatus;
    @IsOptional()
    maxGrade?: number;
}
