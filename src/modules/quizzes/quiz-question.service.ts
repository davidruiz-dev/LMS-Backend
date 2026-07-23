import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { Quiz } from "./entities/quiz.entity";
import { DataSource, Repository } from "typeorm";
import { QuizQuestion } from "./entities/quiz-question.entity";
import { CreateQuestionDto, UpdateQuestionDto } from "./dto/create-question.dto";
import { UserRole } from "../users/entities/user.entity";
import { Course } from "../courses/entities/course.entity";
import { QuestionOption } from "./entities/question-option.entity";
import { assertCourseManager, isCourseManager } from "./utils/quiz-permissions";
import { QuizzesService } from "./quizzes.service";

@Injectable()
export class QuizQuestionService {
    constructor(
        @InjectRepository(QuizQuestion)
        private questionsRepository: Repository<QuizQuestion>,
        @InjectRepository(Course)
        private quizzesService: QuizzesService,
        @InjectDataSource()
        private dataSource: DataSource,
    ) { }

    async addQuestion(quizId: string, createQuestionDto: CreateQuestionDto, userId: string, userRole: UserRole): Promise<QuizQuestion> {
        const quiz = await this.quizzesService.findOne(quizId);
        assertCourseManager(quiz.course, userId, userRole);
    
        return this.dataSource.transaction(async (manager) => {
          const question = manager.create(QuizQuestion, {
            questionText: createQuestionDto.questionText,
            type: createQuestionDto.type,
            points: createQuestionDto.points,
            explanation: createQuestionDto.explanation,
            position: createQuestionDto.position || 0,
            quizId,
          });
    
          const savedQuestion = await manager.save(question);
    
          if(createQuestionDto.options && createQuestionDto.options.length > 0) {
            const options = createQuestionDto.options.map((option, index) => manager.create(QuestionOption, {
              text: option.text,
              isCorrect: option.isCorrect,
              position: option.position ?? index,
              questionId: savedQuestion.id,
            }));
            await manager.save(options);
          }
    
          return manager.findOneOrFail(QuizQuestion, {
            where: { id: savedQuestion.id },
            relations: ['options'],
          })
        })
      }
    
      async updateQuestion(questionId: string, updateQuestionDto: UpdateQuestionDto, userId: string, userRole: UserRole): Promise<QuizQuestion> {
        const question = await this.questionsRepository.findOne({
          where: { id: questionId },
          relations: ['quiz', 'quiz.course', 'options'],
        });
    
        if (!question) throw new NotFoundException(`Question with ID "${questionId}" not found`);
    
        assertCourseManager(question.quiz.course, userId, userRole);
    
        return this.dataSource.transaction(async (manager) => {
          Object.assign(question, {
            questionText: updateQuestionDto.questionText,
            points: updateQuestionDto.points,
            explanation: updateQuestionDto.explanation,
            position: updateQuestionDto.position,
          });
    
          await manager.save(question);
    
          if (updateQuestionDto.options) {
            await manager.delete(QuestionOption, { questionId });
    
            const options = updateQuestionDto.options.map((opt, index) =>
              manager.create(QuestionOption, {
                text: opt.text,
                isCorrect: opt.isCorrect,
                position: opt.position ?? index,
                questionId: question.id,
              }),
            );
            await manager.save(options);
          }
    
          return manager.findOneOrFail(QuizQuestion, {
            where: { id: questionId },
            relations: ['options'],
          });
        });
      }
    
      async removeQuestion(questionId: string, userId: string, userRole: UserRole): Promise<void> {
        const question = await this.questionsRepository.findOne({
          where: { id: questionId },
          relations: ['quiz', 'quiz.course'],
        });
        if (!question) throw new NotFoundException(`Question not found`);
        assertCourseManager(question.quiz.course, userId, userRole);
        await this.questionsRepository.remove(question);
      }
}