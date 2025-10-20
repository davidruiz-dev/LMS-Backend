import { IsNotEmpty, IsOptional } from "class-validator"
import { GradeLevel } from "src/modules/grade-level/entities/grade-level.entity"
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
    @IsNotEmpty()
    gradeLevel: GradeLevel
    gradeLevelId: string
    @IsOptional()
    imageUrl?: string
    @IsOptional()
    imagePublicId?: string
    @IsNotEmpty()
    instructor: User
    instructorId: string;
}
