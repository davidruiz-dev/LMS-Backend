import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser, UserPayload } from 'src/auth/decorators/current-user.decorator';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/create-question.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { QuizQuestionService } from './quiz-question.service';
import { QuizAttemptService } from './quiz-attemp.service';

@Controller()
export class QuizzesController {
  constructor(
    private readonly quizzesService: QuizzesService,
    private readonly quizQuestionService: QuizQuestionService,
    private readonly quizAttemptsService: QuizAttemptService
  ) { } 

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
  async findAll(
    @Param('courseId') courseId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizzesService.findAllByCourseWithStats(courseId, user.id, user.role);
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
    return this.quizQuestionService.addQuestion(quizId, createQuestionDto, user.id, user.role);
  }

  @Patch('questions/:questionId')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async updateQuestion(
    @Param('questionId') questionId: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizQuestionService.updateQuestion(questionId, updateQuestionDto, user.id, user.role);
  }

  @Delete('questions/:questionId')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async removeQuestion(
    @Param('questionId') questionId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizQuestionService.removeQuestion(questionId, user.id, user.role);
  }

  // Attempts
  @Post('quizzes/:quizId/attempts')
  async startAttempt(
    @Param('quizId') quizId: string,
    @CurrentUser() student: UserPayload,
  ) {
    return this.quizAttemptsService.startAttempt(quizId, student.id);
  }

  @Get('quizzes/:quizId/attempts/in-progress')
  @Roles(UserRole.STUDENT)
  async getInProgressAttempt(
    @Param('quizId') quizId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizAttemptsService.getInProgressAttempt(quizId, user.id);
  }

  @Post('attempts/:attemptId/submit')
  async submitAttempt(
    @Param('attemptId') attemptId: string,
    @Body() submitQuizDto: SubmitQuizDto,
    @CurrentUser('id') studentId: string,
  ) {
    return this.quizAttemptsService.submitAttempt(attemptId, submitQuizDto, studentId);
  }

  @Post('attempts/:attemptId/save-progress')
  async saveProgress(
    @Param('attemptId') attemptId: string,
    @Body() submitQuizDto: SubmitQuizDto,
    @CurrentUser('id') studentId: string,
  ) {
    return this.quizAttemptsService.saveProgress(attemptId, submitQuizDto.answers, studentId);
  }

  @Get('quizzes/:quizId/attempts')
  async getAttempts(
    @Param('quizId') quizId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizAttemptsService.getAttempts(quizId, user.id, user.role);
  }

  @Get('attempts/:attemptId')
  async getAttempt(
    @Param('attemptId') attemptId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizAttemptsService.getAttempt(attemptId, user.id, user.role);
  }

  @Get('quizzes/:quizId/all-attempts')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async getAllAttempts(
    @Param('quizId') quizId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizAttemptsService.getAllAttemptsByQuiz(quizId, user.id, user.role);
  }

  @Get('quizzes/:quizId/attempt-count')
  async getAttemptCount(
    @Param('quizId') quizId: string,
    @CurrentUser('id') studentId: string,
  ) {
    return await this.quizAttemptsService.getAttemptCount(quizId, studentId);
  }

  @Post('quizzes/attempt-counts')
  async getAttemptCounts(
    @Body() body: { quizIds: string[] },
    @CurrentUser('id') studentId: string,
  ) {
    const countsMap = await this.quizAttemptsService.getAttemptCountsForQuizzes(body.quizIds, studentId);
    return Object.fromEntries(countsMap);
  }

  @Patch('answers/:answerId/grade')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async gradeManualAnswer(
    @Param('answerId') answerId: string,
    @Body() body: { points: number; feedback?: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizAttemptsService.gradeManualAnswer(answerId, body.points, body.feedback || '', user.id, user.role,);
  }

  @Get('quizzes/:quizId/pending-grading')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async getPendingGrading(
    @Param('quizId') quizId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.quizAttemptsService.getPendingGradingAttempts(quizId, user.id, user.role);
  }
}
