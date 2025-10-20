import { Injectable } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { ILike, Repository } from 'typeorm';
import { CoursePagination } from './dto/course-pagination.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { GradeLevel } from '../grade-level/entities/grade-level.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { paginateResponse } from 'src/common/helpers/pagination-response';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(GradeLevel)
    private readonly gradeLevelRepository: Repository<GradeLevel>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private cloudinaryService: CloudinaryService,
  ) { }

  async create(createCourseDto: CreateCourseDto, imagen: Express.Multer.File) {
    const newCourse = this.courseRepository.create(createCourseDto);
    const grade = await this.gradeLevelRepository.findOneBy({ id: createCourseDto.gradeLevelId })
    if (!grade) throw new Error('grade level not found');
    // instructor
    const instructor = await this.userRepository.findOneBy({ id: createCourseDto.instructorId });
    if (!instructor) throw new Error('instructor not found');

    newCourse.gradeLevel = grade;
    newCourse.instructor = instructor;
    if (imagen) {
      const cloudinaryResponse = await this.cloudinaryService.uploadImage(
        imagen,
        `cursos/${grade.name}`
      );
      newCourse.imageUrl = cloudinaryResponse.secure_url;
      newCourse.imagePublicId = cloudinaryResponse.public_id;
    }
    return this.courseRepository.save(newCourse);
  }

  async findAll(pagination: CoursePagination) {
    const { page = 1, limit = 10, orderBy, order, search } = pagination;
    const skip = (page - 1) * limit;
    const keyword = search ? `%${search}%` : '%%';

    const [data, total] = await this.courseRepository.findAndCount({
      where: [
        { name: ILike(keyword) },
      ],
      relations: ['gradeLevel', 'instructor'],
      take: limit,
      skip: skip,
      order: orderBy && order ? { [orderBy]: order } : { createdAt: 'DESC' },
    });
    return paginateResponse({ data, total, page, limit, route: `${process.env.API_BASE_URL}/courses` });
  }
  // async findAll(pagination: CoursePagination) {
  //   const { page = 1, limit = 10, name, orderBy, order } = pagination
  //   const skip = (page - 1) * limit;
  //   const queryBuilder = this.courseRepository.createQueryBuilder('course')
  //     .leftJoinAndSelect('course.gradeLevel', 'gradeLevel')
  //     .withDeleted();
  //   if (name) queryBuilder.andWhere('course.name ILIKE :name', {
  //     name: `%${name}%`
  //   })
  //   if (orderBy && order) {
  //     queryBuilder.orderBy(`course.${orderBy}`, order)
  //   }
  //   queryBuilder.skip(skip).take(limit);
  //   const [courses, total] = await queryBuilder.getManyAndCount();
  //   const totalPages = Math.ceil(total / limit);
  //   return {
  //     data: courses,
  //     meta: {
  //       total,
  //       page,
  //       limit,
  //       totalPages,
  //       hasNextPage: page < totalPages,
  //       hasPreviousPage: page > 1,
  //     }
  //   }
  // }



  findOne(id: string) {
    return this.courseRepository.findOne({
      where: { id },
      relations: ['gradeLevel', 'instructor']
    });
  }

  async update(id: string, updateCourseDto: UpdateCourseDto, imagen?: Express.Multer.File) {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['gradeLevel', 'instructor'],
    });

    if (!course) {
      throw new Error('Course not found');
    }

    // Actualizar campos simples del DTO
    Object.assign(course, updateCourseDto);

    // Actualizar gradeLevel si cambia
    if (updateCourseDto.gradeLevelId && updateCourseDto.gradeLevelId !== course.gradeLevel?.id) {
      const newGrade = await this.gradeLevelRepository.findOneBy({ id: updateCourseDto.gradeLevelId });
      if (!newGrade) throw new Error('Grade level not found');
      course.gradeLevel = newGrade;
    }

    // Actualizar instructor si cambia
    if (updateCourseDto.instructorId && updateCourseDto.instructorId !== course.instructor?.id) {
      const newInstructor = await this.userRepository.findOneBy({ id: updateCourseDto.instructorId });
      if (!newInstructor) throw new Error('Instructor not found');
      course.instructor = newInstructor;
    }

    // Manejar imagen nueva
    if (imagen) {
      // Eliminar imagen anterior si existe
      if (course.imagePublicId) {
        await this.cloudinaryService.deleteImage(course.imagePublicId);
      }

      const cloudinaryResponse = await this.cloudinaryService.uploadImage(
        imagen,
        `cursos/${course.gradeLevel.name}`
      );

      course.imageUrl = cloudinaryResponse.secure_url;
      course.imagePublicId = cloudinaryResponse.public_id;
    }

    return this.courseRepository.save(course);
  }


  remove(id: number) {
    return `This action removes a #${id} course`;
  }
}
