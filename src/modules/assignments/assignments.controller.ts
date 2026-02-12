import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { CurrentUser, UserPayload } from 'src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/modules/users/entities/user.entity';
import { EnrollmentGuard } from 'src/common/guards/enrollment.guard';
import { CourseOwnerGuard } from 'src/common/guards/course-owner.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('courses/:courseId/assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @UseGuards(CourseOwnerGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  create(
    @Param('courseId') courseId: string,
    @Body() createAssignmentDto: CreateAssignmentDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.assignmentsService.create(courseId, createAssignmentDto, user.id, user.role);
  }

  @Get()
  @UseGuards(EnrollmentGuard)
  findAll(
    @Param('courseId') courseId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.assignmentsService.findAll(courseId, user.id, user.role);
  }

  @Get('upcoming')
  @UseGuards(EnrollmentGuard)
  findUpcoming(
    @Param('courseId') courseId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.assignmentsService.findUpcoming(courseId, userId);
  }

  @Get(':id')
  @UseGuards(EnrollmentGuard)
  findOne(
    @Param('id') id: string,
    @Param('courseId') courseId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.assignmentsService.findOne(courseId,id, user.id, user.role);
  }

  @Patch(':id')
  @UseGuards(CourseOwnerGuard)
  update(
    @Param('courseId') courseId: string,
    @Param('id') assignmentId: string,
    @Body() updateAssignmentDto: UpdateAssignmentDto,
  ) {
    return this.assignmentsService.update(
      courseId,
      assignmentId,
      updateAssignmentDto,
    );
  }

  @Delete(':id')
  @UseGuards(CourseOwnerGuard)
  remove(
    @Param('courseId') courseId: string,
    @Param('id') assignmentId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.assignmentsService.remove(courseId, assignmentId, userId, role);
  }

  @Post(':id/publish')
  @UseGuards(CourseOwnerGuard)
  publish(
    @Param('courseId') courseId: string,
    @Param('id') assignmentId: string,
  ) {
    return this.assignmentsService.publishAssignment(courseId, assignmentId);
  }

  @Post(':id/unpublish')
  @UseGuards(CourseOwnerGuard)
  unpublish(
    @Param('courseId') courseId: string,
    @Param('id') assignmentId: string,
  ) {
    return this.assignmentsService.unpublishAssignment(courseId, assignmentId);
  }
}
