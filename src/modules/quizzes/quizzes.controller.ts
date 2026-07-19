import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser, UserPayload } from 'src/auth/decorators/current-user.decorator';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/create-question.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { QuizAnswer } from './entities/quiz-answer.entity';
import { SaveProgressDto } from './dto/save-progress.dto';

@Controller()
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) { }

  @Post('courses/:courseId/quizzes')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async create(
    @Param('courseId') courseId: string,
    @Body() createQuizDto: CreateQuizDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizzesService.create(courseId, createQuizDto, user.id, user.role);
  }

  @Get('courses/:courseId/quizzes')
  async findAll(@Param('courseId') courseId: string) {
    return this.quizzesService.findAllByCourse(courseId);
  }

  @Get('quizzes/:id')
  async findOne(@Param('id') id: string) {
    return this.quizzesService.findOne(id);
  }

  @Patch('quizzes/:id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateQuizDto: UpdateQuizDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizzesService.update(id, updateQuizDto, user.id, user.role);
  }

  @Delete('quizzes/:id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizzesService.remove(id, user.id, user.role);
  }

  // Questions
  @Post('quizzes/:quizId/questions')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async addQuestion(
    @Param('quizId') quizId: string,
    @Body() createQuestionDto: CreateQuestionDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizzesService.addQuestion(quizId, createQuestionDto, user.id, user.role);
  }

  @Patch('questions/:questionId')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async updateQuestion(
    @Param('questionId') questionId: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizzesService.updateQuestion(questionId, updateQuestionDto, user.id, user.role);
  }

  @Delete('questions/:questionId')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async removeQuestion(
    @Param('questionId') questionId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizzesService.removeQuestion(questionId, user.id, user.role);
  }

  // Attempts
  @Post('quizzes/:quizId/attempts')
  async startAttempt(
    @Param('quizId') quizId: string,
    @CurrentUser() student: UserPayload,
  ) {
    return this.quizzesService.startAttempt(quizId, student.id);
  }

  @Get('quizzes/:quizId/attempts/in-progress')
  @Roles(UserRole.STUDENT)
  async getInProgressAttempt(
    @Param('quizId') quizId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizzesService.getInProgressAttempt(quizId, user.id);
  }

  @Post('attempts/:attemptId/submit')
  async submitAttempt(
    @Param('attemptId') attemptId: string,
    @Body() submitQuizDto: SubmitQuizDto,
    @CurrentUser('id') studentId: string,
  ) {
    return this.quizzesService.submitAttempt(attemptId, submitQuizDto, studentId);
  }

  @Post('attempts/:attemptId/save-progress')
  async saveProgress(
    @Param('attemptId') attemptId: string,
    @Body() dto: SaveProgressDto,
    @CurrentUser('id') studentId: string,
  ) {
    return this.quizzesService.saveProgress(attemptId, dto.answers, studentId);
  }

  @Get('quizzes/:quizId/attempts')
  async getAttempts(
    @Param('quizId') quizId: string,
    @CurrentUser() user: UserPayload,
  ) {
    const { id, role } = user;
    return this.quizzesService.getAttempts(quizId, id, role);
  }

  @Get('attempts/:attemptId')
  async getAttempt(
    @Param('attemptId') attemptId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizzesService.getAttempt(attemptId, user.id, user.role);
  }

  @Get('quizzes/:quizId/all-attempts')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async getAllAttempts(
    @Param('quizId') quizId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizzesService.getAllAttemptsByQuiz(quizId, user.id, user.role);
  }

  @Get('quizzes/:quizId/attempt-count')
  async getAttemptCount(
    @Param('quizId') quizId: string,
    @CurrentUser('id') studentId: string,
  ) {
    const count = await this.quizzesService.getAttemptCount(quizId, studentId);
    return { count };
  }

  @Post('quizzes/attempt-counts')
  async getAttemptCounts(
    @Body() body: { quizIds: string[] },
    @CurrentUser('id') studentId: string,
  ) {
    const countsMap = await this.quizzesService.getAttemptCountsForQuizzes(body.quizIds, studentId);
    return Object.fromEntries(countsMap);
  }

  @Patch('answers/:answerId/grade')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async gradeManualAnswer(
    @Param('answerId') answerId: string,
    @Body() body: { points: number; feedback?: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizzesService.gradeManualAnswer(
      answerId,
      body.points,
      body.feedback || '',
      user.id,
      user.role,
    );
  }

  @Get('quizzes/:quizId/pending-grading')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async getPendingGrading(
    @Param('quizId') quizId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizzesService.getPendingGradingAttempts(quizId, user.id, user.role);
  }
}
