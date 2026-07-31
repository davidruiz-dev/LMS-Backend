import { Module } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Submission } from './entities/submission.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { SupabaseService } from 'src/supabase/supabase.service';
import { Course } from '../courses/entities/course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Submission, Enrollment, Assignment, Course])],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, SupabaseService],
})
export class SubmissionsModule {}
