import { Course } from "../entities/course.entity";

export class CourseDetailDto extends Course {
    assignmentsCount: number;
    enrollmentsCount: number;
    modulesCount: number;
}