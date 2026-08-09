import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Assignment } from 'src/modules/assignments/entities/assignment.entity';
import { Between, Repository } from 'typeorm';
import { UserRole } from 'src/modules/users/entities/user.entity';
import { Course } from 'src/modules/courses/entities/course.entity';
import { Submission, SubmissionStatus } from 'src/modules/submissions/entities/submission.entity';
import { assertCourseManager, isCourseManager } from '../quizzes/utils/quiz-permissions';

type StudentAssignmentStatus = SubmissionStatus | 'not_submitted';

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

  // async findAll(courseId: string, userId: string, role: UserRole) {
  //   const course = await this.coursesRepository.findOne({ where: { id: courseId } });

  //   if (!course) {
  //     throw new NotFoundException('Curso no encontrado');
  //   }

  //   const isInstructor = course.instructorId === userId || role === UserRole.ADMIN;

  //   const queryBuilder = this.assignmentRepository
  //     .createQueryBuilder('assignment')
  //     .where('assignment.courseId = :courseId', { courseId });

  //   // Estudiantes solo ven assignments publicados
  //   if (!isInstructor) {
  //     queryBuilder.andWhere('assignment.isPublished = :published', { published: true });
  //     const now = new Date();
  //     queryBuilder.andWhere(
  //       '(assignment.availableFrom IS NULL OR assignment.availableFrom <= :now)',
  //       { now },
  //     );
  //   }

  //   return queryBuilder.orderBy('assignment.dueDate', 'ASC').getMany();
  // }

  // async findAll(courseId: string, userId: string, role: UserRole) {
  //   const course = await this.coursesRepository.findOne({ where: { id: courseId } });
  //   if (!course) {
  //     throw new NotFoundException('Curso no encontrado');
  //   }
  //   const canViewAllAssignments =
  //   await this.canManageCourse(courseId, userId, role);

  //   const canViewAllAssignments = course.instructorId === userId || role === UserRole.ADMIN;

  //   const queryBuilder = this.assignmentRepository
  //     .createQueryBuilder('assignment')
  //     .where('assignment.courseId = :courseId', {
  //       courseId,
  //     });

  //   // Estudiantes solo ven assignments publicados y disponibles
  //   if (!canViewAllAssignments) {
  //     const now = new Date();

  //     queryBuilder
  //       .andWhere('assignment.isPublished = :published', {
  //         published: true,
  //       })
  //       .andWhere(
  //         '(assignment.availableFrom IS NULL OR assignment.availableFrom <= :now)',
  //         {
  //           now,
  //         },
  //       );
  //   }

  //   const assignments = await queryBuilder
  //     .orderBy('assignment.dueDate', 'ASC')
  //     .getMany();


  //   const stats = await this.getStats(
  //     assignments.map((assignment) => assignment.id),
  //     userId,
  //     role,
  //   );


  //   return assignments.map((assignment) => ({
  //     ...assignment,
  //     stats: stats[assignment.id] ?? {},
  //   }));
  // }

  async findAll(courseId: string, userId: string, role: UserRole) {
    const course = await this.coursesRepository.findOneOrFail({ where: { id: courseId } });
    return !isCourseManager(course, userId, role) ? this.findAllForStudent(courseId, userId)
      : this.findAllForInstructor(courseId);
  }

  private async findAllForStudent(courseId: string, studentId: string) {
    const assignments = await this.assignmentRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect(
        'a.submissions',
        'submission',
        'submission.studentId = :studentId',
        { studentId },
      )
      .where('a.courseId = :courseId', { courseId })
      .orderBy('a.dueDate', 'ASC')
      .getMany();

    return assignments.map((a) => {
      const latest = this.pickLatestAttempt(a.submissions);
      return {
        id: a.id,
        name: a.name,
        dueDate: a.dueDate,
        maxPoints: a.maxPoints,
        isAvailable: a.isAvailable(),
        status: this.resolveStudentStatus(latest),
        isOverdue: this.isOverdue(a, latest),
        submittedAt: latest?.submittedAt ?? null,
        attemptNumber: latest?.attemptNumber ?? 0,
        attemptsLeft:
          a.maxAttempts === -1 ? -1 : a.maxAttempts - (latest?.attemptNumber ?? 0),
        grade: latest?.grade ?? null,
        isLate: latest?.isLate ?? false,
        courseId: a.courseId
      };
    });
  }


  private pickLatestAttempt(submissions: Submission[] = []): Submission | null {
    if (!submissions.length) return null;
    return submissions.reduce((latest, s) =>
      s.attemptNumber > latest.attemptNumber ? s : latest,
    );
  }

  private resolveStudentStatus(submission: Submission | null): StudentAssignmentStatus {
    return submission ? submission.status : 'not_submitted';
  }

  private isOverdue(assignment: Assignment, submission: Submission | null): boolean {
    if (submission) return false;
    return new Date() > assignment.dueDate;
  }

  private async findAllForInstructor(courseId: string) {
    const rows = await this.assignmentRepository
      .createQueryBuilder('a')
      .leftJoin('a.submissions', 'submission')
      .leftJoin('a.course', 'course')
      .leftJoin('course.enrollments', 'enrollment')
      .where('a.courseId = :courseId', { courseId })
      .select('a.id', 'id')
      .addSelect('a.name', 'name')
      .addSelect('a.dueDate', 'dueDate')
      .addSelect('a.maxPoints', 'maxPoints')
      .addSelect('a.courseId', 'courseId')
      .addSelect('a.isPublished', 'isPublished')
      .addSelect('COUNT(DISTINCT enrollment.id)', 'totalStudents')
      .addSelect(
        `COUNT(DISTINCT submission.studentId) FILTER (WHERE submission.status != :draft)`,
        'submittedCount',
      )
      .addSelect(
        `COUNT(DISTINCT submission.studentId) FILTER (WHERE submission.status = :graded)`,
        'gradedCount',
      )
      .setParameters({
        draft: SubmissionStatus.DRAFT,
        graded: SubmissionStatus.GRADED,
      })
      .groupBy('a.id')
      .orderBy('a.dueDate', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      dueDate: r.dueDate,
      maxPoints: Number(r.maxPoints),
      isPublished: r.isPublished,
      totalStudents: Number(r.totalStudents),
      submittedCount: Number(r.submittedCount),
      gradedCount: Number(r.gradedCount),
      pendingGradingCount: Number(r.submittedCount) - Number(r.gradedCount),
      courseId: r.courseId
    }));
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

      if (!assignment.isPublished) {
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
    if (assignment.submissions && assignment.submissions.length > 0) {
      throw new BadRequestException('No puedes eliminar esta tarea si tienes entregas');
    }

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

  async unpublishAssignment(courseId: string, assignmentId: string): Promise<Assignment> {
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

  // stats
  // async getStats(
  //   assignmentIds: string[],
  //   userId: string,
  //   role: UserRole,
  // ) {

  //   if (!assignmentIds.length) {
  //     return {};
  //   }


  //   if (
  //     role === UserRole.ADMIN ||
  //     role === UserRole.INSTRUCTOR
  //   ) {
  //     return this.getInstructorStats(
  //       assignmentIds,
  //     );
  //   }


  //   return this.getStudentStats(
  //     assignmentIds,
  //     userId,
  //   );
  // }


  // private async getInstructorStats(
  //   assignmentIds: string[],
  // ) {

  //   const results = await this.submissionsRepository
  //     .createQueryBuilder('submission')
  //     .select('submission.assignmentId', 'assignmentId')
  //     .addSelect(
  //       'COUNT(submission.id)',
  //       'totalSubmissions',
  //     )
  //     .addSelect(
  //       'AVG(submission.grade)',
  //       'averageGrade',
  //     )
  //     .where(
  //       'submission.assignmentId IN (:...assignmentIds)',
  //       {
  //         assignmentIds,
  //       },
  //     )
  //     .groupBy('submission.assignmentId')
  //     .getRawMany();


  //   return results.reduce((acc, item) => {

  //     acc[item.assignmentId] = {
  //       totalSubmissions: Number(item.totalSubmissions),
  //       averageGrade: Number(
  //         item.averageGrade ?? 0,
  //       ),
  //     };

  //     return acc;

  //   }, {});
  // }

  // private async getStudentStats(
  //   assignmentIds: string[],
  //   userId: string,
  // ) {

  //   const results = await this.submissionsRepository
  //     .createQueryBuilder('submission')
  //     .select('submission.assignmentId', 'assignmentId')
  //     .addSelect('submission.grade', 'grade',)
  //     .addSelect('submission.status', 'status',)
  //     .where('submission.assignmentId IN (:...assignmentIds)',
  //       { assignmentIds, },
  //     )
  //     .andWhere('submission.studentId = :userId',
  //       { userId, },
  //     )
  //     .getRawMany();


  //   return results.reduce((acc, item: Submission) => {

  //     acc[item.assignmentId] = {
  //       submitted: true,
  //       grade: item.grade,
  //       status: item.status,
  //     };

  //     return acc;

  //   }, {
  //   });
  // }
}
