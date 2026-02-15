import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { CurrentUser, UserPayload } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CourseOwnerGuard } from 'src/common/guards/course-owner.guard';
import { UserRole } from 'src/modules/users/entities/user.entity';
import { EnrollmentGuard } from 'src/common/guards/enrollment.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('courses/:courseId/announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @UseGuards(CourseOwnerGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  create(
    @Param('courseId') courseId: string,
    @Body() createAnnouncementDto: CreateAnnouncementDto,
    @CurrentUser() user: UserPayload
  ) {
    return this.announcementsService.create(courseId, createAnnouncementDto, user.id, user.role);
  }

  @Get()
  @UseGuards(EnrollmentGuard)
  findAll(
    @Param('courseId') courseId: string,
    @CurrentUser() user: UserPayload
  ) {
    return this.announcementsService.findAll(courseId, user.id, user.role);
  }

  @Patch(':id')
  @UseGuards(CourseOwnerGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  update(
    @Param('courseId') courseId: string,
    @Param('id') id: string, 
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
    @CurrentUser() user: UserPayload
  ) {
    return this.announcementsService.update(courseId, id, updateAnnouncementDto, user.id, user.role);
  }

  @Delete(':id')
  @UseGuards(CourseOwnerGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  remove(
    @Param('courseId') courseId: string,
    @Param('id') id: string,
    @CurrentUser() user: UserPayload
  ) {
    return this.announcementsService.remove(courseId, id, user.id, user.role);
  }
}
