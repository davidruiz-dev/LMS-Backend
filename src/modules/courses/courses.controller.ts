import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CoursePagination } from './dto/course-pagination.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/modules/users/entities/user.entity';
import { CurrentUser, UserPayload } from 'src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { GradeService } from './grade-calculation.service';

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService, 
    private readonly gradeService: GradeService
  ) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @Post()
  @UseInterceptors(FileInterceptor('imagen'))
  create(
    @Body() createCourseDto: CreateCourseDto,
    @UploadedFile() imagen: Express.Multer.File,
    //@CurrentUser() user: UserPayload,
  ) {
    return this.coursesService.create(createCourseDto, imagen);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.STUDENT)
  @Get()
  async findAll(@Query() paginationDto: CoursePagination, @CurrentUser() user: UserPayload) {
    return this.coursesService.findAll(paginationDto, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @Get('my-courses/active')
  async findMyCoursesActive(@CurrentUser() user: UserPayload) {
    return this.coursesService.findMyCoursesActive(user.id, user.role)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserPayload,) {
    return this.coursesService.findOneWithStats(id, user.id, user.role);
  }

  @Patch(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('imagen'))
  update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto, @UploadedFile() imagen: Express.Multer.File) {
    return this.coursesService.update(id, updateCourseDto, imagen);
  }

  @Delete(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: UserPayload,) {
    return this.coursesService.remove(id, user.id, user.role);
  }

  @Patch(':id/restore')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  restore(@Param('id') id: string, @CurrentUser() user: UserPayload,) {
    return this.coursesService.restore(id, user.id, user.role);
  }

  @Patch(':id/archive')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  archive(@Param('id') id: string, @CurrentUser() user: UserPayload,) {
    return this.coursesService.archive(id, user.id, user.role);
  }

  @Patch(':id/unarchive')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  unarchive(@Param('id') id: string, @CurrentUser() user: UserPayload,) {
    return this.coursesService.unarchive(id, user.id, user.role);
  }

  @Post(':id/publish')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async publish(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.coursesService.publish(id, user.id, user.role);
  }

  // enrollments
  @UseGuards(JwtAuthGuard)
  @Get(':courseId/enrollments')
  async getClassmates(
    @Param('courseId') courseId: string,
    @CurrentUser() user: UserPayload,
  ) {
    const enrollments = await this.coursesService.getEnrollmentsByCourseId(courseId, user);
    return enrollments;
  }

  @Get(':courseId/grade')
  async getMyGrade(
    @Param('courseId') courseId: string,
    @CurrentUser() user: UserPayload,
  ){
    return await this.gradeService.calculateFinalGrade(courseId, user.id)
  }
}
