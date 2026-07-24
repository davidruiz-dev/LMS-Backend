import { Expose, Type } from 'class-transformer';
import { SubmissionStatus } from '../entities/submission.entity';

class SubmissionAttachmentDto {
  @Expose() id: string;
  @Expose() fileName: string;
  @Expose() fileUrl: string;
  @Expose() fileSize: number;
}

class SubmissionStudentDto {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() email: string;
}

export class SubmissionResponseDto {
  @Expose() id: string;
  @Expose() content: string | null;
  @Expose() status: SubmissionStatus;
  @Expose() submittedAt: Date | null;
  @Expose() isLate: boolean;
  @Expose() attemptNumber: number;
  @Expose() grade: number | null;
  @Expose() feedback: string | null;
  @Expose() gradedAt: Date | null;

  @Expose()
  @Type(() => SubmissionAttachmentDto)
  attachmentFiles: SubmissionAttachmentDto[];

  @Expose()
  @Type(() => SubmissionStudentDto)
  student: SubmissionStudentDto;
}