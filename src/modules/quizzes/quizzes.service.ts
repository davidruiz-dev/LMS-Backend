import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Quiz } from './entities/quiz.entity';
import { Repository } from 'typeorm';
import { Course } from '../courses/entities/course.entity';
import { UserRole } from '../users/entities/user.entity';
import { assertCourseManager, isCourseManager } from './utils/quiz-permissions';
import { checkCourseAccess } from '../courses/utils/checkCourseAccess';
import { AttemptStatus } from './entities/quiz-attempt.entity';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectRepository(Quiz)
    private quizzesRepository: Repository<Quiz>,
    @InjectRepository(Course)
    private coursesRepository: Repository<Course>,
  ) { }

  async create(courseId: string, createQuizDto: CreateQuizDto, userId: string, userRole: UserRole): Promise<Quiz> {
    const course = await this.coursesRepository.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException(`Course not found`);
    assertCourseManager(course, userId, userRole);
    const quiz = this.quizzesRepository.create({ ...createQuizDto, courseId });
    return this.quizzesRepository.save(quiz);
  }

  async findAllByCourse(courseId: string): Promise<Quiz[]> {
    return this.quizzesRepository.find({
      where: { courseId },
      order: { createdAt: 'DESC' },
      relations: ['questions']
    });
  }

  async findAllByCourseWithStats(courseId: string, userId: string, userRole: UserRole) {
    const course = await this.coursesRepository.findOneOrFail({ where: { id: courseId }, relations: ['enrollments'] });
    checkCourseAccess(course, userId, userRole);
    const qb = this.quizzesRepository
      .createQueryBuilder('quiz')
      .leftJoin('quiz.questions', 'question')
      .leftJoin('quiz.attempts', 'attempt')
      .select([
        'quiz.id AS id',
        'quiz.title AS title',
        'quiz.points AS points',
        'quiz.type AS type',
        'quiz.allowedAttempts AS "allowedAttempts"',
        'quiz.description AS description',
        'quiz.dueDate AS "dueDate"',
        'quiz.timeLimit AS "timeLimit"',
        'quiz.published AS published',
        'COUNT(DISTINCT question.id) AS "questionCount"',
      ])
      .where('quiz.courseId = :courseId', { courseId })
      .groupBy('quiz.id')
      .addGroupBy('quiz.title')
      .orderBy('quiz.createdAt', 'DESC');

    if (isCourseManager(course, userId, userRole)) {
      qb.addSelect(
        `
        COUNT(
          DISTINCT CASE
            WHEN attempt.status = :submitted
            AND EXISTS (
              SELECT 1
              FROM quiz_answers a
              INNER JOIN quiz_questions q
                ON q.id = a."questionId"
              WHERE
                a."attemptId" = attempt.id
                AND q.type IN ('essay','short_answer','fill_in_blank')
                AND a."pointsAwarded" IS NULL
            )
            THEN attempt.id
          END
        )
       `,
        'pendingAttempts',
      )
      .setParameter('submitted', AttemptStatus.SUBMITTED);
    } else {
      qb.andWhere(
        'quiz.published = true'
      )
    }

    const rows = await qb.getRawMany();
    return rows;
  }

  
  async findOne(id: string): Promise<Quiz> {
    const quiz = await this.quizzesRepository.findOne({
      where: { id },
      relations: ['course', 'questions', 'questions.options'],
      order: { questions: { position: 'ASC', options: { position: 'ASC' } } },
    });
    if (!quiz) throw new NotFoundException(`Quiz not found`);
    return quiz;
  }

  async update(id: string, updateQuizDto: UpdateQuizDto, userId: string, userRole: UserRole): Promise<Quiz> {
    const quiz = await this.findOne(id);
    assertCourseManager(quiz.course, userId, userRole);
    Object.assign(quiz, updateQuizDto);
    return this.quizzesRepository.save(quiz);
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const quiz = await this.findOne(id);
    assertCourseManager(quiz.course, userId, userRole);
    await this.quizzesRepository.remove(quiz);
  }


}