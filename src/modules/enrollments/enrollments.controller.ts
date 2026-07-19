import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { CurrentUser, UserPayload } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/modules/users/entities/user.entity';

@Controller()
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post('courses/:courseId/enrollments')
  create(
    @Body() createEnrollmentDto: CreateEnrollmentDto,
    @Param('courseId') courseId: string
  ) {
    return this.enrollmentsService.create(courseId, createEnrollmentDto);
  }

  @Get('enrollments/me')
  @Roles(UserRole.STUDENT)
  getMyEnrollments(@CurrentUser() user: UserPayload,) {
    return this.enrollmentsService.getMyEnrollments(user.id);
  }

  @Get('enrollments/me/active')
  getActiveEnrollment(
    @CurrentUser() user: UserPayload
  ){ 
    return this.enrollmentsService.enrollmentActiveMe(user.id);
  }

  @Get('enrollments/course/:id')
  getEnrollmentsByCourseId(@Param('id') id: string) {
    return this.enrollmentsService.getEnrollmentsByCourseId(id);
  }

  @Get('enrollments/user/:id')
  findAllEnrolledCoursesByUser(@Param('id') id: string) {
    return this.enrollmentsService.findAllEnrolledCoursesByUser(id);
  }

  @Get('enrollments/active/user/:id')
  findEnrolledActiveCoursesByUser(@Param('id') id: string) {
    return this.enrollmentsService.findEnrolledActiveCoursesByUser(id);
  }

  @Get('enrollments/:id')
  findOne(@Param('id') id: string) {
    return this.enrollmentsService.findOne(id);
  }

  @Patch('enrollments/:id')
  update(@Param('id') id: string, @Body() updateEnrollmentDto: UpdateEnrollmentDto) {
    return this.enrollmentsService.update(+id, updateEnrollmentDto);
  }

  @Delete('enrollments/:id')
  remove(@Param('id') id: string) {
    return this.enrollmentsService.remove(+id);
  }
}
