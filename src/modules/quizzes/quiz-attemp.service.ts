import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Quiz } from "./entities/quiz.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { AttemptStatus, QuizAttempt } from "./entities/quiz-attempt.entity";
import { QuizAnswer } from "./entities/quiz-answer.entity";
import { UserRole } from "../users/entities/user.entity";
import { SubmitQuizDto } from "./dto/submit-quiz.dto";
import { QuizzesService } from "./quizzes.service";
import { isManualQuestion } from "./constants/quiz.constants";
import { assertCourseManager, isCourseManager } from "./utils/quiz-permissions";

type AnswerInput = SubmitQuizDto['answers'][number];

@Injectable()
export class QuizAttemptService {
    constructor(
        @InjectRepository(QuizAttempt)
        private attemptsRepository: Repository<QuizAttempt>,
        @InjectRepository(QuizAnswer)
        private answersRepository: Repository<QuizAnswer>,
        private quizzesService: QuizzesService,
    ) { }

    async startAttempt(quizId: string, studentId: string): Promise<QuizAttempt> {
        const quiz = await this.quizzesService.findOne(quizId);
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
            throw new ForbiddenException('Has alcanzado el número máximo de intentos');
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
            throw new NotFoundException(`Intento con ID "${attemptId}" no encontrado`);
        }

        this.assertAttemptOwner(attempt, studentId);
        this.assertAttemptInProgress(attempt);

        await this.answersRepository.manager.transaction(async (manager) => {
            await manager.delete(QuizAnswer, { attemptId });

            let autoGradedScore = 0;
            let hasManualQuestions = false;

            for (const answerDto of submitQuizDto.answers) {
                const question = attempt.quiz.questions.find((q) => q.id === answerDto.questionId);
                if (!question) continue;

                const { isCorrect, pointsAwarded } = this.gradeAnswer(question, answerDto);
                if (pointsAwarded === null) hasManualQuestions = true;
                else autoGradedScore += pointsAwarded;

                const answer = manager.create(QuizAnswer, {
                    attemptId: attempt.id,
                    questionId: question.id,
                    answerText: answerDto.answerText || null,
                    selectedOptionIds: answerDto.selectedOptionIds || [],
                    isCorrect,
                    pointsAwarded,
                });

                await manager.save(answer);
            }

            attempt.status = hasManualQuestions ? AttemptStatus.SUBMITTED : AttemptStatus.GRADED;
            attempt.submittedAt = new Date();
            attempt.timeSpent = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
            attempt.score = hasManualQuestions ? null : autoGradedScore;

            await manager.save(attempt);
        });

        return this.getAttemptById(attemptId, studentId);
    }

    async saveProgress(attemptId: string, answers: AnswerInput[], studentId: string): Promise<{ saved: boolean; savedAt: Date }> {
        const attempt = await this.attemptsRepository.findOne({ where: { id: attemptId }, relations: ['quiz'] });

        if (!attempt) {
            throw new NotFoundException(`Intento no encontrado`);
        }

        this.assertAttemptOwner(attempt, studentId);
        this.assertAttemptInProgress(attempt);
        this.assertWithinTimeLimit(attempt);

        const existingAnswers = await this.answersRepository.find({ where: { attemptId } });
        const existingByQuestion = new Map(existingAnswers.map((a) => [a.questionId, a]));

        const toSave = answers.map((answerDto) => {
            const existing = existingByQuestion.get(answerDto.questionId);
            return this.answersRepository.create({
                ...(existing ? { id: existing.id } : {}),
                attemptId,
                questionId: answerDto.questionId,
                answerText: answerDto.answerText ?? null,
                selectedOptionIds: answerDto.selectedOptionIds ?? [],
            });
        });

        await this.answersRepository.save(toSave);

        return { saved: true, savedAt: new Date() };
    }

    async getAttemptById(attemptId: string, studentId: string): Promise<QuizAttempt> {
        const attempt = await this.attemptsRepository.findOne({
            where: { id: attemptId, studentId },
            relations: ['quiz', 'quiz.questions', 'quiz.questions.options'],
        });

        if (!attempt) {
            throw new NotFoundException(`Intento no encontrado`);
        }

        return attempt;
    }

    async getAttempts(quizId: string, userId: string, role: UserRole): Promise<QuizAttempt[]> {
        const quiz = await this.quizzesService.findOne(quizId);

        const where =
            role === UserRole.STUDENT
                ? { quizId, studentId: userId }
                : (() => {
                    assertCourseManager(quiz.course, userId, role);
                    return { quizId };
                })();

        return this.attemptsRepository.find({
            where,
            relations: ['answers', 'answers.question'],
            order: { createdAt: 'DESC' },
        });
    }

    async getAttempt(attemptId: string, userId: string, role: UserRole): Promise<QuizAttempt> {
        const attempt = await this.attemptsRepository.findOne({
            where: { id: attemptId },
            relations: ['quiz', 'quiz.course', 'answers', 'answers.question', 'answers.question.options'],
        });

        if (!attempt) {
            throw new NotFoundException(`Intento no encontrado`);
        }

        const isOwner = role === UserRole.STUDENT && attempt.studentId === userId;
        const isManager = role !== UserRole.STUDENT && isCourseManager(attempt.quiz.course, userId, role);

        if (!isOwner && !isManager) {
            throw new ForbiddenException('No tienes permiso para ver este intento');
        }

        return attempt;
    }

    async getAllAttemptsByQuiz(quizId: string, userId: string, userRole: UserRole): Promise<QuizAttempt[]> {
        const quiz = await this.quizzesService.findOne(quizId);
        assertCourseManager(quiz.course, userId, userRole);

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
                student: { id: true, firstName: true, lastName: true, email: true },
            },
        });
    }

    async getAttemptCount(quizId: string, studentId: string): Promise<number> {
        return this.attemptsRepository.count({ where: { quizId, studentId } });
    }

    async getAttemptCountsForQuizzes(quizIds: string[], studentId: string): Promise<Map<string, number>> {
        const counts = await this.attemptsRepository
            .createQueryBuilder('attempt')
            .select('attempt.quizId', 'quizId')
            .addSelect('COUNT(attempt.id)', 'count')
            .where('attempt.quizId IN (:...quizIds)', { quizIds })
            .andWhere('attempt.studentId = :studentId', { studentId })
            .groupBy('attempt.quizId')
            .getRawMany<{ quizId: string; count: string }>();

        const countsMap = new Map<string, number>(quizIds.map((id) => [id, 0]));
        counts.forEach(({ quizId, count }) => countsMap.set(quizId, parseInt(count, 10)));

        return countsMap;
    }

    async getInProgressAttempt(quizId: string, studentId: string): Promise<QuizAttempt | null> {
        const attempt = await this.attemptsRepository.findOne({
            where: { quizId, studentId, status: AttemptStatus.IN_PROGRESS },
            relations: ['answers', 'answers.question', 'answers.question.options'],
            order: { startedAt: 'DESC' },
        });

        if (!attempt) return null;

        if (attempt.answers?.length) {
            const uniqueAnswers = new Map<string, QuizAnswer>();
            for (const answer of attempt.answers) {
                const existing = uniqueAnswers.get(answer.questionId);
                if (!existing || answer.id > existing.id) {
                    uniqueAnswers.set(answer.questionId, answer);
                }
            }

            if (uniqueAnswers.size !== attempt.answers.length) {
                await this.cleanDuplicateAnswers(attempt.id);
            }
            attempt.answers = Array.from(uniqueAnswers.values());
        }

        return attempt;
    }

    // grading
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
            throw new NotFoundException(`Respuesta con ID "${answerId}" no encontrada`);
        }

        assertCourseManager(answer.attempt.quiz.course, graderId, userRole);
        this.assertManualQuestionType(answer.question.type);

        const pointsNum = Number(points);
        if (isNaN(pointsNum)) {
            throw new BadRequestException('Los puntos deben ser un número válido');
        }
        if (pointsNum > Number(answer.question.points)) {
            throw new BadRequestException(`Los puntos no pueden superar ${answer.question.points} para esta pregunta`);
        }

        await this.answersRepository.manager.transaction(async (manager) => {
            answer.pointsAwarded = pointsNum;
            answer.feedback = feedback;
            answer.isCorrect = pointsNum > 0;

            await manager.save(answer);
            await this.recalculateAttemptScore(answer.attemptId, manager);
        });

        return answer;
    }

    async getPendingGradingAttempts(quizId: string, userId: string, userRole: UserRole): Promise<QuizAttempt[]> {
        return this.attemptsRepository
            .createQueryBuilder('attempt')
            .leftJoinAndSelect('attempt.quiz', 'quiz')
            .leftJoinAndSelect('quiz.course', 'course')
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
                )`,
            )
            .orderBy('attempt.submittedAt', 'ASC')
            .getMany()
            .then((attempts) => {
                attempts.forEach((a) => assertCourseManager(a.quiz.course, userId, userRole));
                return attempts;
            });
    }

    private async recalculateAttemptScore(attemptId: string, manager: EntityManager): Promise<void> {
        const answers = await manager.find(QuizAnswer, { where: { attemptId }, relations: ['question'] });

        let totalScore = 0;
        let allGraded = true;

        for (const answer of answers) {
            if (answer.pointsAwarded === null) allGraded = false;
            else totalScore += Number(answer.pointsAwarded);
        }

        const updateData: Partial<QuizAttempt> = { score: totalScore };
        if (allGraded) updateData.status = AttemptStatus.GRADED;

        await manager.update(QuizAttempt, attemptId, updateData);
    }

    private assertManualQuestionType(type: string): void {
        if (!isManualQuestion(type)) {
            throw new BadRequestException('Este tipo de pregunta no requiere calificación manual');
        }
    }






    private async cleanDuplicateAnswers(attemptId: string): Promise<void> {
        const answers = await this.answersRepository.find({ where: { attemptId }, order: { createdAt: 'DESC' } });

        const latestPerQuestion = new Map<string, QuizAnswer>();
        for (const answer of answers) {
            const existing = latestPerQuestion.get(answer.questionId);
            if (!existing || answer.createdAt > existing.createdAt) {
                latestPerQuestion.set(answer.questionId, answer);
            }
        }

        const keepIds = new Set(Array.from(latestPerQuestion.values()).map((a) => a.id));
        const deleteIds = answers.filter((a) => !keepIds.has(a.id)).map((a) => a.id);

        if (deleteIds.length) {
            await this.answersRepository.delete(deleteIds);
        }
    }

    private async forceSubmitExpiredAttempt(attemptId: string): Promise<void> {
        const attempt = await this.attemptsRepository.findOne({
            where: { id: attemptId },
            relations: ['quiz', 'quiz.questions', 'answers'],
        });
        if (!attempt) return;

        const hasManualQuestions = attempt.quiz.questions.some((q) => isManualQuestion(q.type));
        const autoGradedScore = attempt.answers.reduce(
            (sum, a) => sum + (a.pointsAwarded !== null ? Number(a.pointsAwarded) : 0),
            0,
        );

        attempt.status = hasManualQuestions ? AttemptStatus.SUBMITTED : AttemptStatus.GRADED;
        attempt.submittedAt = new Date();
        attempt.timeSpent = Math.floor((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000);
        attempt.score = autoGradedScore;

        await this.attemptsRepository.save(attempt);
    }

    private gradeAnswer(
        question: Quiz['questions'][number],
        answerDto: AnswerInput,
    ): { isCorrect: boolean; pointsAwarded: number | null } {
        if (isManualQuestion(question.type)) {
            return { isCorrect: false, pointsAwarded: null };
        }

        const correctOptions = question.options.filter((opt) => opt.isCorrect).map((opt) => opt.id);
        const selectedOptions = answerDto.selectedOptionIds || [];

        const isCorrect =
            correctOptions.length === selectedOptions.length &&
            correctOptions.every((id) => selectedOptions.includes(id));

        return { isCorrect, pointsAwarded: isCorrect ? Number(question.points) : 0 };
    }

    private assertQuizAvailable(quiz: Quiz): void {
        if (!quiz.published) {
            throw new ForbiddenException('Este quiz no está publicado');
        }
        const now = new Date();
        if (quiz.availableFrom && now < new Date(quiz.availableFrom)) {
            throw new ForbiddenException('Este quiz aún no está disponible');
        }
        if (quiz.availableUntil && now > new Date(quiz.availableUntil)) {
            throw new ForbiddenException('Este quiz ya no está disponible');
        }
    }

    private assertAttemptOwner(attempt: QuizAttempt, studentId: string): void {
        if (attempt.studentId !== studentId) {
            throw new ForbiddenException('Este intento no te pertenece');
        }
    }

    private assertAttemptInProgress(attempt: QuizAttempt): void {
        if (attempt.status !== AttemptStatus.IN_PROGRESS) {
            throw new BadRequestException('Este intento ya no está en progreso');
        }
    }

    private assertWithinTimeLimit(attempt: QuizAttempt & { quiz: Quiz }): void {
        if (!attempt.quiz.timeLimit) return;
        const elapsedMinutes = (Date.now() - attempt.startedAt.getTime()) / 1000 / 60;
        if (elapsedMinutes > attempt.quiz.timeLimit) {
            throw new BadRequestException('Se superó el tiempo límite');
        }
    }

    private isAttemptExpired(attempt: QuizAttempt, quiz: Quiz): boolean {
        if (!quiz.timeLimit) return false;
        const deadline = attempt.startedAt.getTime() + quiz.timeLimit * 60_000;
        return Date.now() > deadline;
    }

}