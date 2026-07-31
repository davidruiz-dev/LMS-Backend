import { Module } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from 'src/modules/courses/entities/course.entity';
import { Assignment } from 'src/modules/assignments/entities/assignment.entity';
import { Enrollment } from 'src/modules/enrollments/entities/enrollment.entity';
import { Submission } from 'src/modules/submissions/entities/submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Assignment, Enrollment, Submission])],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
})
export class AssignmentsModule {}
