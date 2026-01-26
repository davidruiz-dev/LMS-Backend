import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { CurrentUser, UserPayload } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/modules/users/entities/user.entity';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  create(@Body() createEnrollmentDto: CreateEnrollmentDto) {
    return this.enrollmentsService.create(createEnrollmentDto);
  }

  @Get()
  findAll() {
    return this.enrollmentsService.findAll();
  }

  @Get('me')
  @Roles(UserRole.STUDENT)
  getMyEnrollments(@CurrentUser() user: UserPayload,) {
    return this.enrollmentsService.getMyEnrollments(user.id);
  }

  @Get('course/:id')
  getEnrollmentsByCourseId(@Param('id') id: string) {
    return this.enrollmentsService.getEnrollmentsByCourseId(id);
  }

  @Get('user/:id')
  findAllEnrolledCoursesByUser(@Param('id') id: string) {
    return this.enrollmentsService.findAllEnrolledCoursesByUser(id);
  }

  @Get('active/user/:id')
  findEnrolledActiveCoursesByUser(@Param('id') id: string) {
    return this.enrollmentsService.findEnrolledActiveCoursesByUser(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.enrollmentsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEnrollmentDto: UpdateEnrollmentDto) {
    return this.enrollmentsService.update(+id, updateEnrollmentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.enrollmentsService.remove(+id);
  }
}
