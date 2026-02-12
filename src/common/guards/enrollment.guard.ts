import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from 'src/modules/courses/entities/course.entity';
import { Enrollment, EnrollmentStatus } from 'src/modules/enrollments/entities/enrollment.entity';
import { UserRole } from 'src/modules/users/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class EnrollmentGuard implements CanActivate {
    constructor(
        @InjectRepository(Enrollment)
        private enrollmentRepository: Repository<Enrollment>,
        @InjectRepository(Course)
        private courseRepository: Repository<Course>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const courseId = request.params.courseId || request.body.courseId;

        if (!user || !courseId) {
            return false;
        }

        // Admins e instructores tienen acceso completo
        if (user.role === UserRole.ADMIN) {
            return true;
        }

        // Verificar si el usuario es instructor del curso
        const course = await this.courseRepository.findOne({
            where: { id: courseId },
            relations: ['instructor']
        });

        if (course?.instructor?.id === user.id) {
            return true;
        }

        // Verificar si el usuario está matriculado
        const enrollment = await this.enrollmentRepository.findOne({
            where: {
                user: { id: user.id },
                course: { id: courseId },
                status: EnrollmentStatus.ACTIVE
            }
        });

        if (!enrollment) {
            throw new ForbiddenException();
        }

        return true;
    }
}