import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Quiz } from './entities/quiz.entity';
import { Repository } from 'typeorm';
import { QuestionType, QuizQuestion } from './entities/quiz-question.entity';
import { QuestionOption } from './entities/question-option.entity';
import { AttemptStatus, QuizAttempt } from './entities/quiz-attempt.entity';
import { QuizAnswer } from './entities/quiz-answer.entity';
import { Course } from '../courses/entities/course.entity';
import { UserRole } from '../users/entities/user.entity';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/create-question.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectRepository(Quiz)
    private quizzesRepository: Repository<Quiz>,
    @InjectRepository(QuizQuestion)
    private questionsRepository: Repository<QuizQuestion>,
    @InjectRepository(QuestionOption)
    private optionsRepository: Repository<QuestionOption>,
    @InjectRepository(QuizAttempt)
    private attemptsRepository: Repository<QuizAttempt>,
    @InjectRepository(QuizAnswer)
    private answersRepository: Repository<QuizAnswer>,
    @InjectRepository(Course)
    private coursesRepository: Repository<Course>,
  ) { }

  async create(courseId: string, createQuizDto: CreateQuizDto, userId: string, userRole: UserRole): Promise<Quiz> {
    const course = await this.coursesRepository.findOne({ where: { id: courseId } });

    if (!course) {
      throw new NotFoundException(`Course with ID "${courseId}" not found`);
    }

    if (course.instructorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to create quizzes in this course');
    }

    const quiz = this.quizzesRepository.create({
      ...createQuizDto,
      courseId,
    });

    return this.quizzesRepository.save(quiz);
  }

  async findAllByCourse(courseId: string): Promise<Quiz[]> {
    return this.quizzesRepository.find({
      where: { courseId },
      order: { createdAt: 'DESC' },
      relations: ['questions']
    });
  }

  async findOne(id: string): Promise<Quiz> {
    const quiz = await this.quizzesRepository.findOne({
      where: { id },
      relations: ['course', 'questions', 'questions.options'],
      order: { questions: { position: 'ASC', options: { position: 'ASC' } } },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID "${id}" not found`);
    }

    return quiz;
  }

  async update(id: string, updateQuizDto: UpdateQuizDto, userId: string, userRole: UserRole): Promise<Quiz> {
    const quiz = await this.findOne(id);
    const course = await this.coursesRepository.findOne({ where: { id: quiz.courseId } });

    if (!course) throw new NotFoundException();

    if (course.instructorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this quiz');
    }

    Object.assign(quiz, updateQuizDto);
    return this.quizzesRepository.save(quiz);
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const quiz = await this.findOne(id);
    const course = await this.coursesRepository.findOne({ where: { id: quiz.courseId } });
    if (!course) {
      throw new NotFoundException(`Course not found`);
    }

    if (course.instructorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this quiz');
    }

    await this.quizzesRepository.remove(quiz);
  }

  // Questions
  async addQuestion(quizId: string, createQuestionDto: CreateQuestionDto, userId: string, userRole: UserRole): Promise<QuizQuestion | null> {
    const quiz = await this.findOne(quizId);
    const course = await this.coursesRepository.findOne({ where: { id: quiz.courseId } });
    if (!course) {
      throw new NotFoundException(`Course with ID not found`);
    }

    if (course.instructorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to add questions to this quiz');
    }

    // Crear la pregunta
    const question = this.questionsRepository.create({
      questionText: createQuestionDto.questionText,
      type: createQuestionDto.type,
      points: createQuestionDto.points,
      explanation: createQuestionDto.explanation,
      position: createQuestionDto.position || 0,
      quizId,
    });

    const savedQuestion = await this.questionsRepository.save(question);

    // Crear las opciones
    if (createQuestionDto.options && createQuestionDto.options.length > 0) {
      const options = createQuestionDto.options.map((opt, index) =>
        this.optionsRepository.create({
          text: opt.text,
          isCorrect: opt.isCorrect,
          position: opt.position ?? index,
          questionId: savedQuestion.id,
        })
      );

      await this.optionsRepository.save(options);
    }

    return this.questionsRepository.findOne({
      where: { id: savedQuestion.id },
      relations: ['options'],
    });
  }

  async updateQuestion(questionId: string, updateQuestionDto: UpdateQuestionDto, userId: string, userRole: UserRole): Promise<QuizQuestion | null> {
    const question = await this.questionsRepository.findOne({
      where: { id: questionId },
      relations: ['quiz', 'quiz.course', 'options'],
    });

    if (!question) {
      throw new NotFoundException(`Question with ID "${questionId}" not found`);
    }

    if (question.quiz.course.instructorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this question');
    }

    Object.assign(question, {
      questionText: updateQuestionDto.questionText,
      points: updateQuestionDto.points,
      explanation: updateQuestionDto.explanation,
      position: updateQuestionDto.position,
    });

    await this.questionsRepository.save(question);

    // Actualizar opciones si se proporcionan
    if (updateQuestionDto.options) {
      // Eliminar opciones existentes
      await this.optionsRepository.delete({ questionId });

      // Crear nuevas opciones
      const options = updateQuestionDto.options.map((opt, index) =>
        this.optionsRepository.create({
          text: opt.text,
          isCorrect: opt.isCorrect,
          position: opt.position ?? index,
          questionId: question.id,
        })
      );

      await this.optionsRepository.save(options);
    }

    return this.questionsRepository.findOne({
      where: { id: questionId },
      relations: ['options'],
    });
  }

  async removeQuestion(questionId: string, userId: string, userRole: UserRole): Promise<void> {
    const question = await this.questionsRepository.findOne({
      where: { id: questionId },
      relations: ['quiz', 'quiz.course'],
    });

    if (!question) {
      throw new NotFoundException(`Question with ID "${questionId}" not found`);
    }

    if (question.quiz.course.instructorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this question');
    }

    await this.questionsRepository.remove(question);
  }

  // ---------------------------------------------------Attempts ---------------------------------------------------------------------------

  async getAttemptById(attemptId: string, studentId: string): Promise<QuizAttempt> {
    const attempt = await this.attemptsRepository.findOne({
      where: { id: attemptId, studentId },
      relations: ['quiz', 'quiz.questions', 'quiz.questions.options'],
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID "${attemptId}" not found`);
    }

    return attempt;
  }

  async startAttempt(quizId: string, studentId: string): Promise<QuizAttempt> {
    const quiz = await this.findOne(quizId);
    this.assertQuizAvailable(quiz);

    const existingAttempt = await this.attemptsRepository.findOne({
      where: { quizId, studentId, status: AttemptStatus.IN_PROGRESS },
      order: { startedAt: 'DESC' },
    });

    if (existingAttempt) {
      if (this.isAttemptExpired(existingAttempt, quiz)) {
        await this.forceSubmitExpiredAttempt(existingAttempt.id);
      } else {
        return existingAttempt;
      }
    }

    const previousAttempts = await this.attemptsRepository.count({
      where: { quizId, studentId },
    });

    if (quiz.allowedAttempts !== -1 && previousAttempts >= quiz.allowedAttempts) {
      throw new ForbiddenException('You have reached the maximum number of attempts');
    }

    const attempt = this.attemptsRepository.create({
      quizId,
      studentId,
      attemptNumber: previousAttempts + 1,
      status: AttemptStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    return this.attemptsRepository.save(attempt);
  }


  async submitAttempt(attemptId: string, submitQuizDto: SubmitQuizDto, studentId: string): Promise<QuizAttempt> {
    const attempt = await this.attemptsRepository.findOne({
      where: { id: attemptId },
      relations: ['quiz', 'quiz.questions', 'quiz.questions.options'],
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID "${attemptId}" not found`);
    }

    if (attempt.studentId !== studentId) {
      throw new ForbiddenException('This is not your attempt');
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('This attempt has already been submitted');
    }

    const queryRunner = this.answersRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. ELIMINAR todas las respuestas existentes
      await queryRunner.manager.delete(QuizAnswer, { attemptId });

      let autoGradedScore = 0;
      let hasManualQuestions = false;
      //const answers: QuizAnswer[] = [];

      // 2. Crear nuevas respuestas
      for (const answerDto of submitQuizDto.answers) {
        const question = attempt.quiz.questions.find(
          (q) => q.id === answerDto.questionId,
        );
        if (!question) continue;

        const isManualType = ['essay', 'short_answer', 'fill_in_blank'].includes(
          question.type,
        );

        let pointsAwarded: number | null = null;
        let isCorrect = false;

        if (isManualType) {
          pointsAwarded = null;
          isCorrect = false;
          hasManualQuestions = true;
        } else {
          // Preguntas automáticas
          const correctOptions = question.options
            .filter((opt) => opt.isCorrect)
            .map((opt) => opt.id);
          const selectedOptions = answerDto.selectedOptionIds || [];

          isCorrect =
            correctOptions.length === selectedOptions.length &&
            correctOptions.every((id) => selectedOptions.includes(id));

          pointsAwarded = isCorrect ? Number(question.points) : 0;
          autoGradedScore += pointsAwarded;
        }

        const answer = this.answersRepository.create({
          attemptId: attempt.id,
          questionId: question.id,
          answerText: answerDto.answerText || null,
          selectedOptionIds: answerDto.selectedOptionIds || [],
          isCorrect,
          pointsAwarded,
        });

        await queryRunner.manager.save(answer);
      }

      // 3. Actualizar intento
      const timeSpent = Math.floor(
        (Date.now() - attempt.startedAt.getTime()) / 1000,
      );

      attempt.status = hasManualQuestions
        ? AttemptStatus.SUBMITTED
        : AttemptStatus.GRADED;
      attempt.submittedAt = new Date();
      attempt.timeSpent = timeSpent;
      attempt.score = hasManualQuestions ? null : autoGradedScore;

      await queryRunner.manager.save(attempt);
      await queryRunner.commitTransaction();

      return this.getAttemptById(attemptId, studentId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private gradeAnswer(question: QuizQuestion, answerDto: any): { isCorrect: boolean; pointsAwarded: number | null } {
    if (question.type === QuestionType.MULTIPLE_CHOICE || question.type === QuestionType.TRUE_FALSE) {
      const correctOptions = question.options
        .filter(opt => opt.isCorrect)
        .map(opt => opt.id);

      const selectedOptions = answerDto.selectedOptionIds || [];

      const isCorrect =
        correctOptions.length === selectedOptions.length &&
        correctOptions.every(id => selectedOptions.includes(id));

      return {
        isCorrect,
        pointsAwarded: isCorrect ? Number(question.points) : 0,
      };
    }

    // Para short_answer y essay, necesitan calificación manual
    return { isCorrect: false, pointsAwarded: null };
  }

  async getAttempts(quizId: string, userId: string, role: UserRole): Promise<QuizAttempt[]> {
    const quiz = await this.quizzesRepository.findOne({
      where: { id: quizId },
      relations: ['course']
    });

    if (!quiz) throw new NotFoundException('No existe este quiz');

    switch (role) {
      case UserRole.ADMIN:
        return this.attemptsRepository.find({
          where: { quizId },
          relations: ['answers', 'answers.question'],
          order: { createdAt: 'DESC' },
        });
      case UserRole.INSTRUCTOR:
        if (quiz.course.instructorId !== userId) {
          throw new ForbiddenException(
            'No tienes permiso para ver los intentos de este quiz',
          );
        }

        return this.attemptsRepository.find({
          where: { quizId },
          relations: ['answers', 'answers.question'],
          order: { createdAt: 'DESC' },
        });
      case UserRole.STUDENT:
        return this.attemptsRepository.find({
          where: { quizId, studentId: userId },
          relations: ['answers', 'answers.question'],
          order: { createdAt: 'DESC' },
        });
      default:
        throw new ForbiddenException();
    };
  }

  async getAttempt(attemptId: string, userId: string, role: UserRole): Promise<QuizAttempt> {
    const attempt = await this.attemptsRepository.findOne({
      where: { id: attemptId },
      relations: ['quiz', 'quiz.course', 'answers', 'answers.question', 'answers.question.options'],
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt not found`);
    }

    const isOwner = role === UserRole.STUDENT && attempt.studentId === userId;
    const isInstructor = role === UserRole.INSTRUCTOR && attempt.quiz.course.instructorId === userId;
    const isAdmin = role === UserRole.ADMIN;

    if (!isOwner && !isInstructor && !isAdmin) {
      throw new ForbiddenException('You do not have permission to view this attempt');
    }

    return attempt;
  }

  // Obtener todos los intentos de un quiz (para instructores)
  async getAllAttemptsByQuiz(quizId: string, userId: string, userRole: UserRole): Promise<QuizAttempt[]> {
    const quiz = await this.quizzesRepository.findOne({
      where: { id: quizId },
      relations: ['course'],
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID "${quizId}" not found`);
    }

    // Verificar permisos
    if (quiz.course.instructorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to view these attempts');
    }

    return this.attemptsRepository.find({
      where: { quizId },
      relations: ['student'],
      order: { startedAt: 'DESC' },
      select: {
        id: true,
        attemptNumber: true,
        status: true,
        score: true,
        startedAt: true,
        submittedAt: true,
        timeSpent: true,
        student: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    });
  }

  // Obtener conteo de intentos de un estudiante para un quiz
  async getAttemptCount(quizId: string, studentId: string): Promise<number> {
    return this.attemptsRepository.count({
      where: { quizId, studentId },
    });
  }

  // Obtener conteos de intentos para múltiples quizzes (optimizado)
  async getAttemptCountsForQuizzes(quizIds: string[], studentId: string): Promise<Map<string, number>> {
    const counts = await this.attemptsRepository
      .createQueryBuilder('attempt')
      .select('attempt.quizId', 'quizId')
      .addSelect('COUNT(attempt.id)', 'count')
      .where('attempt.quizId IN (:...quizIds)', { quizIds })
      .andWhere('attempt.studentId = :studentId', { studentId })
      .groupBy('attempt.quizId')
      .getRawMany();

    const countsMap = new Map<string, number>();
    counts.forEach(({ quizId, count }) => {
      countsMap.set(quizId, parseInt(count, 10));
    });

    // Asegurar que todos los quizzes tengan un conteo
    quizIds.forEach(id => {
      if (!countsMap.has(id)) {
        countsMap.set(id, 0);
      }
    });

    return countsMap;
  }

  // Calificar respuesta manualmente (para essay, short answer, fill in blank)
  async gradeManualAnswer(
    answerId: string,
    points: number,
    feedback: string,
    graderId: string,
    userRole: UserRole,
  ): Promise<QuizAnswer> {
    const answer = await this.answersRepository.findOne({
      where: { id: answerId },
      relations: ['attempt', 'attempt.quiz', 'attempt.quiz.course', 'question'],
    });

    if (!answer) {
      throw new NotFoundException(`Answer with ID "${answerId}" not found`);
    }

    // Verificar permisos
    if (
      answer.attempt.quiz.course.instructorId !== graderId &&
      userRole !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        'You do not have permission to grade this answer',
      );
    }

    // Verificar que sea una pregunta manual
    const manualTypes = ['essay', 'short_answer', 'fill_in_blank'];
    if (!manualTypes.includes(answer.question.type)) {
      throw new BadRequestException('This question type does not require manual grading');
    }

    const pointsNum = Number(points);
    if (isNaN(pointsNum)) {
      throw new BadRequestException('Points must be a valid number');
    }

    if (pointsNum > Number(answer.question.points)) {
      throw new BadRequestException(
        `Points cannot exceed ${answer.question.points} for this question`,
      );
    }

    // Usar transacción para mantener consistencia
    const queryRunner = this.answersRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Actualizar la respuesta
      answer.pointsAwarded = pointsNum;
      answer.feedback = feedback;
      answer.isCorrect = pointsNum > 0;

      await queryRunner.manager.save(answer);

      // Recalcular score total
      await this.recalculateAttemptScore(answer.attemptId, queryRunner);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return answer;
  }

  // Modificar recalculateAttemptScore para aceptar queryRunner opcional
  private async recalculateAttemptScore(
    attemptId: string,
    queryRunner?: any,
  ): Promise<void> {
    const manager = queryRunner?.manager || this.answersRepository.manager;

    const answers = await manager.find(QuizAnswer, {
      where: { attemptId },
      relations: ['question'],
    });

    let totalScore = 0;
    let allGraded = true;

    for (const answer of answers) {
      if (answer.pointsAwarded === null) {
        allGraded = false;
      } else {
        totalScore += Number(answer.pointsAwarded);
      }
    }

    const updateData: Partial<QuizAttempt> = {
      score: totalScore,
    };

    if (allGraded) {
      updateData.status = AttemptStatus.GRADED;
    }

    await manager.update(QuizAttempt, attemptId, updateData);
  }


  async saveProgress(
    attemptId: string,
    answers: QuizAnswer[],
    studentId: string,
  ): Promise<{ saved: boolean; savedAt: Date }> {
    const attempt = await this.attemptsRepository.findOne({
      where: { id: attemptId },
      relations: ['quiz'],
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID "${attemptId}" not found`);
    }

    if (attempt.studentId !== studentId) {
      throw new ForbiddenException('This is not your attempt');
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('This attempt is no longer in progress');
    }

    // Verificar tiempo límite (no permitir guardar si ya expiró)
    if (attempt.quiz.timeLimit) {
      const elapsedMinutes = (Date.now() - attempt.startedAt.getTime()) / 1000 / 60;
      if (elapsedMinutes > attempt.quiz.timeLimit) {
        throw new BadRequestException('Time limit exceeded');
      }
    }

    console.log(answers)

    // Upsert de cada respuesta (sin calificar, solo guardar el estado actual)
    for (const answerDto of answers) {
      const existing = await this.answersRepository.findOne({
        where: { attemptId, questionId: answerDto.questionId },
      });

      if (existing) {
        existing.answerText = answerDto.answerText ?? null;
        existing.selectedOptionIds = answerDto.selectedOptionIds ?? [];
        await this.answersRepository.save(existing);
      } else {
        const newAnswer = this.answersRepository.create({
          attemptId,
          questionId: answerDto.questionId,
          answerText: answerDto.answerText,
          selectedOptionIds: answerDto.selectedOptionIds,
        });
        await this.answersRepository.save(newAnswer);
      }
    }

    return { saved: true, savedAt: new Date() };
  }

  async getInProgressAttempt(
    quizId: string,
    studentId: string,
  ): Promise<QuizAttempt | null> {
    const attempt = await this.attemptsRepository.findOne({
      where: {
        quizId,
        studentId,
        status: AttemptStatus.IN_PROGRESS,
      },
      relations: ['answers', 'answers.question', 'answers.question.options'],
      order: {
        startedAt: 'DESC',
      },
    });

    if (!attempt) return null;

    // SOLUCIÓN: Garantizar que no hay respuestas duplicadas
    if (attempt.answers && attempt.answers.length > 0) {
      const uniqueAnswers = new Map();

      for (const answer of attempt.answers) {
        const existing = uniqueAnswers.get(answer.questionId);

        // Si ya existe una respuesta para esta pregunta, quedarse con la más reciente
        if (!existing || answer.id > existing.id) {
          uniqueAnswers.set(answer.questionId, answer);
        }
      }

      // Reemplazar con respuestas únicas
      attempt.answers = Array.from(uniqueAnswers.values());

      // Opcional: Limpiar duplicados en BD si es necesario
      if (uniqueAnswers.size !== attempt.answers.length) {
        await this.cleanDuplicateAnswers(attempt.id);
      }
    }

    return attempt;
  }

  // Método auxiliar para limpiar duplicados
  private async cleanDuplicateAnswers(attemptId: string): Promise<void> {
    const answers = await this.answersRepository.find({
      where: { attemptId },
      order: { createdAt: 'DESC' },
    });

    const latestPerQuestion = new Map();

    for (const answer of answers) {
      const existing = latestPerQuestion.get(answer.questionId);
      if (!existing || answer.createdAt > existing.createdAt) {
        latestPerQuestion.set(answer.questionId, answer);
      }
    }

    const answersToKeep = Array.from(latestPerQuestion.values()).map(a => a.id);
    const answersToDelete = answers
      .filter(a => !answersToKeep.includes(a.id))
      .map(a => a.id);

    if (answersToDelete.length > 0) {
      await this.answersRepository.delete(answersToDelete);
    }
  }

  async getPendingGradingAttempts(
    quizId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<QuizAttempt[]> {
    const quiz = await this.quizzesRepository.findOne({
      where: { id: quizId },
      relations: ['course'],
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID "${quizId}" not found`);
    }

    if (quiz.course.instructorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to view these attempts',
      );
    }

    // Consulta optimizada que solo trae intentos con respuestas sin calificar
    return this.attemptsRepository
      .createQueryBuilder('attempt')
      .leftJoinAndSelect('attempt.answers', 'answer')
      .leftJoinAndSelect('answer.question', 'question')
      .leftJoinAndSelect('attempt.student', 'student')
      .where('attempt.quizId = :quizId', { quizId })
      .andWhere('attempt.status = :status', { status: AttemptStatus.SUBMITTED })
      .andWhere(
        `EXISTS (
        SELECT 1 FROM quiz_answers a 
        INNER JOIN quiz_questions q ON a."questionId" = q.id
        WHERE a."attemptId" = attempt.id 
        AND q.type IN ('essay', 'short_answer', 'fill_in_blank')
        
        AND a."pointsAwarded" IS NULL
      )`
      )
      .orderBy('attempt.submittedAt', 'ASC')
      .getMany();
  }

  // Método auxiliar para verificar disponibilidad del quiz
  private assertQuizAvailable(quiz: Quiz): void {
    if (!quiz.published) {
      throw new ForbiddenException('This quiz is not published');
    }
    const now = new Date();
    if (quiz.availableFrom && now < new Date(quiz.availableFrom)) {
      throw new ForbiddenException('This quiz is not yet available');
    }
    if (quiz.availableUntil && now > new Date(quiz.availableUntil)) {
      throw new ForbiddenException('This quiz is no longer available');
    }
  }

  private isAttemptExpired(attempt: QuizAttempt, quiz: Quiz): boolean {
    if (!quiz.timeLimit) return false;
    const deadline = attempt.startedAt.getTime() + quiz.timeLimit * 60_000;
    return Date.now() > deadline;
  }

  private async forceSubmitExpiredAttempt(attemptId: string): Promise<void> {
    const attempt = await this.attemptsRepository.findOne({
      where: { id: attemptId },
      relations: ['quiz', 'quiz.questions', 'answers'],
    });
    if (!attempt) return;

    const hasManualQuestions = attempt.quiz.questions.some(q =>
      ['essay', 'short_answer', 'fill_in_blank'].includes(q.type),
    );

    const autoGradedScore = attempt.answers.reduce(
      (sum, a) => sum + (a.pointsAwarded !== null ? Number(a.pointsAwarded) : 0),
      0,
    );

    attempt.status = hasManualQuestions ? AttemptStatus.SUBMITTED : AttemptStatus.GRADED;
    attempt.submittedAt = new Date();
    attempt.timeSpent = Math.floor(
      (attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000,
    );
    attempt.score = autoGradedScore;

    await this.attemptsRepository.save(attempt);
  }
}


// async submitAttempt(attemptId: string, submitQuizDto: SubmitQuizDto, studentId: string): Promise<QuizAttempt | null> {
//   const attempt = await this.attemptsRepository.findOne({
//     where: { id: attemptId },
//     relations: ['quiz', 'quiz.questions', 'quiz.questions.options'],
//   });

//   if (!attempt) {
//     throw new NotFoundException(`Attempt with ID "${attemptId}" not found`);
//   }

//   if (attempt.studentId !== studentId) {
//     throw new ForbiddenException('This is not your attempt');
//   }

//   if (attempt.status !== AttemptStatus.IN_PROGRESS) {
//     throw new BadRequestException('This attempt has already been submitted');
//   }

//   // Verificar tiempo límite
//   if (attempt.quiz.timeLimit) {
//     const timeSpent = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000 / 60);
//     if (timeSpent > attempt.quiz.timeLimit) {
//       throw new BadRequestException('Time limit exceeded');
//     }
//   }

//   let totalScore = 0;
//   const answers: QuizAnswer[] = [];

//   const hasManualQuestions = attempt.quiz.questions.some(q =>
//     ['essay', 'short_answer', 'fill_in_blank'].includes(q.type),
//   );

//   // Procesar cada respuesta
//   for (const answerDto of submitQuizDto.answers) {
//     const question = attempt.quiz.questions.find(q => q.id === answerDto.questionId);

//     if (!question) continue;

//     const { isCorrect, pointsAwarded } = this.gradeAnswer(question, answerDto);

//     // Solo sumar las preguntas calificadas automáticamente
//     if (pointsAwarded !== null) {
//       totalScore += Number(pointsAwarded);
//     }

//     const answer = this.answersRepository.create({
//       attemptId: attempt.id,
//       questionId: question.id,
//       answerText: answerDto.answerText,
//       selectedOptionIds: answerDto.selectedOptionIds,
//       isCorrect,
//       pointsAwarded,
//     });

//     answers.push(answer);
//   }

//   // Guardar respuestas
//   await this.answersRepository.save(answers);

//   // Actualizar attempt
//   const timeSpent = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);

//   attempt.status = hasManualQuestions ? AttemptStatus.SUBMITTED : AttemptStatus.GRADED;
//   attempt.submittedAt = new Date();
//   attempt.timeSpent = timeSpent;
//   attempt.score = totalScore;

//   return await this.attemptsRepository.save(attempt);
// }

