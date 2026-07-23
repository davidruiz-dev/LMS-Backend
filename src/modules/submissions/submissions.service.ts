import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Submission, SubmissionStatus } from './entities/submission.entity';
import { Repository } from 'typeorm';
import { Assignment } from '../assignments/entities/assignment.entity';
import { UserPayload } from 'src/auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { Enrollment } from '../enrollments/entities/enrollment.entity';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly supabaseService: SupabaseService,
  ) {}

  async createSubmission( dto: CreateSubmissionDto, files: Express.Multer.File[], studentId: string ): Promise<Submission> {
    const assignment = await this.assignmentRepository.findOne({ where: { id: dto.assignmentId }});
    this.assertAssignmentExists(assignment);

    await this.assertIsEnrolledStudent(studentId, assignment.courseId);

    const previousSubmission = await this.submissionRepository.findOne({
      where: { assignmentId: dto.assignmentId, studentId },
      order: { attemptNumber: 'DESC' },
    });

    this.assertCanSubmit(previousSubmission, assignment);
    this.assertHasContentOrFiles(dto.content, files);

    const attachmentUrls = await this.uploadAttachments(files, studentId, dto.assignmentId, dto.courseId);

    const isLate = assignment.dueDate ? new Date() > new Date(assignment.dueDate) : false;
    const attemptNumber = previousSubmission ? previousSubmission.attemptNumber + 1 : 1;

    const submission = this.submissionRepository.create({
      assignmentId: dto.assignmentId,
      studentId,
      content: dto.content ,
      attachments: attachmentUrls,
      status: SubmissionStatus.SUBMITTED,
      submittedAt: new Date(),
      isLate,
      attemptNumber,
    });

    return this.submissionRepository.save(submission);
  }

  private async uploadAttachments(
    files: Express.Multer.File[],
    studentId: string,
    assignmentId: string,
    courseId: string,
  ): Promise<string[]> {
    if (!files || files.length === 0) return [];

    const uploads = await Promise.all(
      files.map((file) =>
        this.supabaseService.uploadPdf(file, `courses/${courseId}/assignments/${assignmentId}/${studentId}`),
      ),
    );

    return uploads.map((upload) => upload.publicUrl);
  }

  private assertAssignmentExists(assignment: Assignment | null): asserts assignment is Assignment {
    if (!assignment) {
      throw new NotFoundException('Tarea no encontrada');
    }
  }

  private async assertIsEnrolledStudent(studentId: string, courseId: string): Promise<void> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { userId: studentId, courseId },
    });

    if (!enrollment) {
      throw new ForbiddenException('No estás inscrito en este curso');
    }
  }

  private assertCanSubmit(previousSubmission: Submission | null, assignment: Assignment): void {
    if (assignment.dueDate && new Date() > new Date(assignment.dueDate) && !assignment.allowLateSubmissions) {
      throw new BadRequestException('La fecha límite de entrega ha pasado');
    }

    if (!previousSubmission) return;

    if (!previousSubmission.canResubmit(assignment)) {
      throw new BadRequestException('Has alcanzado el número máximo de intentos permitidos');
    }
  }

  private assertHasContentOrFiles(content: string | undefined, files: Express.Multer.File[]): void {
    if (!content?.trim() && (!files || files.length === 0)) {
      throw new BadRequestException('Debes incluir contenido o al menos un archivo PDF');
    }
  }




  async findAllByAssignment(assignmentId: string, user: UserPayload): Promise<Submission[]> {
    await this.assertCanManageAssignment(assignmentId, user);

    return this.submissionRepository.find({
      where: { assignmentId },
      //relations: ["files"],
      order: { createdAt: "ASC" },
    });
  }

  async grade(id: string, dto: GradeSubmissionDto, user: UserPayload): Promise<Submission> {
    const submission = await this.submissionRepository.findOne({
      where: { id },
      relations: ["assignment", "assignment.course"],
    });

    this.assertFound(submission);
    await this.assertCanManageAssignment(submission.assignmentId, user);
    this.assertGradeInRange(dto.grade, submission.assignment.maxPoints);

    submission.grade = dto.grade;
    if (dto.feedback !== undefined) submission.feedback = dto.feedback;

    return this.submissionRepository.save(submission);
  }

  // ── Private guards ────────────────────────────────────────────────────────────

  private async assertCanManageAssignment(assignmentId: string, user: UserPayload) {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ["course"],
    });

    if (!assignment) throw new NotFoundException("Tarea no encontrada.");

    const isAdmin = user.role === UserRole.ADMIN;
    const isOwner = assignment.course.instructorId === user.id;

    if (!isAdmin && !isOwner)
      throw new ForbiddenException("No tienes permiso para esta acción.");
  }

  private assertFound(entity: unknown): asserts entity {
    if (!entity) throw new NotFoundException("Entrega no encontrada.");
  }

  private assertGradeInRange(grade: number, maxScore: number | null) {
    if (maxScore !== null && grade > maxScore)
      throw new BadRequestException(
        `La calificación no puede superar ${maxScore} puntos.`
      );
  }
}
