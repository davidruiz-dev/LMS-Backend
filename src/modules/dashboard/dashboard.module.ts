import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { Module as ModuleCourse } from '../modules/entities/module.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment, Assignment, Submission, ModuleCourse])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
