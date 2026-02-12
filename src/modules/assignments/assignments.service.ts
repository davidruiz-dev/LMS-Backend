import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Assignment } from 'src/modules/assignments/entities/assignment.entity';
import { Between, Repository } from 'typeorm';
import { UserRole } from 'src/modules/users/entities/user.entity';
import { Course } from 'src/modules/courses/entities/course.entity';
import { Submission } from 'src/modules/submissions/entities/submission.entity';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Course)
    private coursesRepository: Repository<Course>,
    @InjectRepository(Submission)
    private submissionsRepository: Repository<Submission>,
  ) { }

  private validateInstructor(course: Course, userId: string, role: UserRole) {
    if (course.instructorId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
  }

  private validateDates(dto: any): void {
    const dueDate = new Date(dto.dueDate);
    const now = new Date();

    // Validar que la fecha de entrega no sea en el pasado (con margen de 1 hora)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    if (dueDate < oneHourAgo) {
      throw new BadRequestException(
        'La fecha de entrega no puede ser en el pasado',
      );
    }

    if (dto.availableFrom) {
      const availableFrom = new Date(dto.availableFrom);
      if (availableFrom >= dueDate) {
        throw new BadRequestException(
          'La fecha de disponibilidad debe ser anterior a la fecha de entrega',
        );
      }
    }

    if (dto.availableUntil) {
      const availableUntil = new Date(dto.availableUntil);
      if (availableUntil <= dueDate) {
        throw new BadRequestException(
          'La fecha de cierre debe ser posterior a la fecha de entrega',
        );
      }
    }

    if (dto.availableFrom && dto.availableUntil) {
      const availableFrom = new Date(dto.availableFrom);
      const availableUntil = new Date(dto.availableUntil);
      if (availableUntil <= availableFrom) {
        throw new BadRequestException(
          'La fecha de cierre debe ser posterior a la fecha de disponibilidad',
        );
      }
    }
  }


  async create(courseId: string, createAssignmentDto: CreateAssignmentDto, userId: string, role: UserRole) {
    const course = await this.coursesRepository.findOneBy({ id: courseId });

    if (!course) {
      throw new NotFoundException();
    }

    // Validar fechas
    this.validateDates(createAssignmentDto);

    this.validateInstructor(course, userId, role)

    // Validar que las fechas estén dentro del rango del curso
    const dueDate = new Date(createAssignmentDto.dueDate);
    const courseStart = new Date(course.startDate);
    const courseEnd = new Date(course.endDate);

    if (dueDate < courseStart || dueDate > courseEnd) {
      throw new BadRequestException(
        'La fecha de entrega debe estar dentro del rango del curso',
      );
    }

    const assignment = await this.assignmentRepository.create({
      ...createAssignmentDto,
      courseId
    })

    return this.assignmentRepository.save(assignment);
  }

  async findAll(courseId: string, userId: string, role: UserRole) {
    const course = await this.coursesRepository.findOne({ where: { id: courseId } });

    if (!course) {
      throw new NotFoundException();
    }

    const isInstructor = course.instructorId === userId || role === UserRole.ADMIN;

    const queryBuilder = this.assignmentRepository
      .createQueryBuilder('assignment')
      .where('assignment.courseId = :courseId', { courseId });

    // Estudiantes solo ven assignments publicados
    if (!isInstructor) {
      queryBuilder.andWhere('assignment.isPublished = :published', { published: true });
      const now = new Date();
      queryBuilder.andWhere(
        '(assignment.availableFrom IS NULL OR assignment.availableFrom <= :now)',
        { now },
      );
    }

    return queryBuilder.orderBy('assignment.dueDate', 'ASC').getMany();
  }

  async findUpcoming(courseId: string, userId: string) {
    const now = new Date();
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

    const assignments = await this.assignmentRepository.find({
      where: {
        courseId,
        isPublished: true,
        dueDate: Between(now, twoWeeksFromNow),
      },
      order: {
        dueDate: 'ASC',
      },
      take: 10,
    });

    //return await this.enrichWithSubmissionData(assignments, userId);
    return assignments
  }

  async findOne(courseId: string, assignmentId: string, userId: string, userRole: UserRole): Promise<Assignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId, courseId },
      relations: ['course'],
    });

    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    const isInstructor =
      assignment.course.instructorId === userId ||
      userRole === UserRole.ADMIN;

    // Verificar acceso para estudiantes
    if (!isInstructor) {
      if (!assignment.isPublished) {
        throw new ForbiddenException(
          'Esta asignación no está disponible',
        );
      }

      if (!assignment.isAvailable()) {
        throw new ForbiddenException(
          'Esta asignación no está disponible en este momento',
        );
      }

      // Agregar información de la entrega del estudiante
      const submission = await this.submissionsRepository.findOne({
        where: {
          assignmentId: assignment.id,
          studentId: userId,
        },
        order: { submittedAt: 'DESC' },
      });

      return {
        ...assignment,
        userSubmission: submission || null,
      } as any;
    }

    // Para instructores, agregar estadísticas
    //const stats = await this.getSubmissionStats(assignment.id);

    return {
      ...assignment,
      //statistics: stats,
    } as any;
  }

  async update(
    courseId: string,
    assignmentId: string,
    updateAssignmentDto: UpdateAssignmentDto,
  ): Promise<Assignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId, courseId },
      relations: ['submissions'],
    });

    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    // Validar si hay entregas y se intenta cambiar configuraciones críticas
    const hasSubmissions = assignment.submissions && assignment.submissions.length > 0;

    if (hasSubmissions) {
      // Advertir sobre cambios en maxPoints
      if (updateAssignmentDto.maxPoints &&
        updateAssignmentDto.maxPoints !== assignment.maxPoints) {
        // Aquí podrías implementar lógica para reescalar calificaciones
        console.warn('Cambiando maxPoints con entregas existentes');
      }
    }

    // Validar fechas si se actualizan
    if (updateAssignmentDto.dueDate ||
      updateAssignmentDto.availableFrom ||
      updateAssignmentDto.availableUntil) {
      this.validateDates({
        ...assignment,
        ...updateAssignmentDto,
      } as any);
    }

    Object.assign(assignment, updateAssignmentDto);
    return await this.assignmentRepository.save(assignment);
  }

  async remove(courseId: string, id: string, userId: string, userRole: UserRole): Promise<void> {
    const assignment = await this.findOne(courseId, id, userId, userRole);
    const course = await this.coursesRepository.findOne({ where: { id: assignment.courseId } });

    if (!course) {
      throw new NotFoundException()
    }

    if (course.instructorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }

    // No permitir eliminar si ya hay submissions
    // if (assignment.submissions && assignment.submissions.length > 0) {
    //   throw new BadRequestException('Cannot delete assignment with existing submissions');
    // }

    await this.assignmentRepository.remove(assignment);
  }

  async publishAssignment(courseId: string, assignmentId: string): Promise<Assignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId, courseId },
    });

    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    // Validaciones antes de publicar
    if (!assignment.description || assignment.description.length < 10) {
      throw new BadRequestException(
        'La asignación debe tener una descripción adecuada',
      );
    }

    if (assignment.dueDate < new Date()) {
      throw new BadRequestException(
        'No se puede publicar una asignación con fecha de entrega pasada',
      );
    }

    if (assignment.maxPoints <= 0) {
      throw new BadRequestException(
        'La asignación debe tener puntos asignados',
      );
    }

    assignment.isPublished = true;
    return await this.assignmentRepository.save(assignment);
  }

  async unpublishAssignment(courseId: string,assignmentId: string): Promise<Assignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId, courseId },
      relations: ['submissions'],
    });

    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    // Verificar si hay entregas
    const submissionCount = assignment.submissions?.length || 0;
    if (submissionCount > 0) {
      console.warn(
        `Despublicando asignación con ${submissionCount} entregas existentes`,
      );
    }

    assignment.isPublished = false;
    return await this.assignmentRepository.save(assignment);
  }
}
