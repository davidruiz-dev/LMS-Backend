import { Module } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Announcement } from 'src/modules/announcements/entities/announcement.entity';
import { Course } from 'src/modules/courses/entities/course.entity';
import { Enrollment } from 'src/modules/enrollments/entities/enrollment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Announcement, Course, Enrollment])],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
