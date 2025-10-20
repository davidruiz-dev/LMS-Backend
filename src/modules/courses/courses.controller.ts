import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CoursePagination } from './dto/course-pagination.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('imagen'))
  create(
    @Body() createCourseDto: CreateCourseDto,
    @UploadedFile() imagen: Express.Multer.File
  ) {
    console.log("createCourseDto: ",createCourseDto)
    return this.coursesService.create(createCourseDto, imagen);
  }

  @Get()
  async findAll(@Query() paginationDto: CoursePagination) {
    return this.coursesService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('imagen'))
  update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto, @UploadedFile() imagen: Express.Multer.File) {
    return this.coursesService.update(id, updateCourseDto, imagen);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coursesService.remove(+id);
  }
}
