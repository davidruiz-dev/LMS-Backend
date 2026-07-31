import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFiles, Req } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { CurrentUser, UserPayload } from 'src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { FilesInterceptor } from '@nestjs/platform-express';
import { pdfFileFilter } from './utils/pdf-file.filter';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Controller('')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) { }

  @Post('submissions')
  @Roles(UserRole.STUDENT)
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: undefined,
      fileFilter: pdfFileFilter,
      limits: { fileSize: 30 * 1024 * 1024 },
    }),
  )
  async create(
    @Body() dto: CreateSubmissionDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    return this.submissionsService.createSubmission(dto, files, req.user.id);
  }

  @Get("assignments/:assignmentId/submissions")
  @UseGuards(JwtAuthGuard)
  getAllSubmissions(
    @Param("assignmentId") assignmentId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.submissionsService.findAllByAssignment(assignmentId, user);
  }

  @Patch("submissions/:id/grade")
  @UseGuards(JwtAuthGuard)
  grade(
    @Param("id") id: string,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.submissionsService.grade(id, dto, user);
  }

  @Get("assignments/:assignmentId/submissions/me")
  @UseGuards(JwtAuthGuard)
  getMySubmissions(
    @Param("assignmentId") assignmentId: string,
    @CurrentUser('id') studentId: string,
  ) {
    return this.submissionsService.findMySubmissions(studentId, assignmentId);
  }

  @Get('submissions/:submissionId')
  findOneSubmission(
    @Param("submissionId") submissionId: string,
  ) {
    return this.submissionsService.findOneSubmission(submissionId);
  }
}
