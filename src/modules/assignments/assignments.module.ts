import { Module } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from 'src/modules/courses/entities/course.entity';
import { Assignment } from 'src/modules/assignments/entities/assignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Assignment])],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
})
export class AssignmentsModule {}
