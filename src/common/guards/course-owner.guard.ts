import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from 'src/modules/courses/entities/course.entity';
import { UserRole } from 'src/modules/users/entities/user.entity';
import { Repository } from 'typeorm';
/**
 * Guard que verifica si el usuario es el instructor del curso
 * o es un administrador.
 * 
 * Uso: Protege cualquier endpoint que modifique recursos del curso
 * (el curso mismo, módulos, asignaciones, etc.)
 * 
 * Extrae courseId de:
 * - params.courseId (rutas anidadas como /courses/:courseId/modules)
 * - params.id (rutas directas como /courses/:id)
 */
@Injectable()
export class CourseOwnerGuard implements CanActivate {
    constructor(
        @InjectRepository(Course)
        private coursesRepository: Repository<Course>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        const user = request.user;

        // Extraer courseId de diferentes ubicaciones posibles
        const courseId = request.params.courseId || request.params.id;

        if (!courseId) {
            throw new ForbiddenException('ID de curso no proporcionado');
        }

        // Los admins siempre tienen acceso
        if (user.role === UserRole.ADMIN) {
            return true;
        }

        const course = await this.coursesRepository.findOne({
            where: { id: courseId },
            select: ['id', 'instructorId', 'name'],
        });

        if (!course) {
            throw new NotFoundException('Curso no encontrado');
        }

        // Solo el instructor del curso puede acceder
        if (course.instructorId !== user.id) {
            throw new ForbiddenException(
                'Solo el instructor del curso puede realizar esta acción',
            );
        }

        // Adjuntamos el curso al request para uso posterior si es necesario
        request.course = course;
        return true;
    }
}