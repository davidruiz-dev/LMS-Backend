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

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

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

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserPayload,) {
    return this.coursesService.findOne(id, user.id, user.role);
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

  @Post(':id/publish')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async publish(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.coursesService.publish(id, user.id, user.role);
  }
}
