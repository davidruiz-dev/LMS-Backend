import { ForbiddenException } from '@nestjs/common';
import { Course } from '../../courses/entities/course.entity';
import { UserRole } from '../../users/entities/user.entity';

export function isCourseManager(course: Course, userId: string, userRole: UserRole): boolean {
  return course.instructorId === userId || userRole === UserRole.ADMIN;
}

export function assertCourseManager(course: Course, userId: string, userRole: UserRole): void {
  if (!isCourseManager(course, userId, userRole)) {
    throw new ForbiddenException('No tienes permiso para gestionar este recurso');
  }
}