import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Quiz } from './entities/quiz.entity';
import { Repository } from 'typeorm';
import { Course } from '../courses/entities/course.entity';
import { UserRole } from '../users/entities/user.entity';
import { assertCourseManager } from './utils/quiz-permissions';

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