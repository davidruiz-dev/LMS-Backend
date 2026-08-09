import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { User } from 'src/modules/users/entities/user.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { GradeService } from './grade-calculation.service';
import { Submission } from '../submissions/entities/submission.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { QuizAttempt } from '../quizzes/entities/quiz-attempt.entity';
import { Assignment } from '../assignments/entities/assignment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, User, Enrollment, Submission, Quiz, QuizAttempt, Assignment]),
    CloudinaryModule
  ],
  controllers: [CoursesController],
  providers: [CoursesService, GradeService],
})
export class CoursesModule {}
