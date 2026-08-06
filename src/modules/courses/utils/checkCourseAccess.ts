import { UserRole } from "src/modules/users/entities/user.entity";
import { Course, CourseStatus } from "../entities/course.entity";
import { ForbiddenException } from "@nestjs/common";

export function checkCourseAccess(course: Course, userId: string, userRole: UserRole): void {
    if (userRole === UserRole.ADMIN || course.instructorId === userId || course.enrollments.some(e => e.userId === userId)) {
        return;
    }

    if (course.enrollments.some(e => e.userId === userId) && course.status !== CourseStatus.PUBLISHED) {
        throw new ForbiddenException('No tienes acceso a este curso');
    }
}