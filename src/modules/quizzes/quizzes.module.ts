import { Module } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../courses/entities/course.entity';
import { Quiz } from './entities/quiz.entity';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuestionOption } from './entities/question-option.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { QuizAnswer } from './entities/quiz-answer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    Quiz,
    QuizQuestion,
    QuestionOption,
    QuizAttempt,
    QuizAnswer,
    Course,
  ])],
  controllers: [QuizzesController],
  providers: [QuizzesService],
})
export class QuizzesModule {}
