import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Course, CourseStatus } from './entities/course.entity';
import { ILike, Repository } from 'typeorm';
import { CoursePagination } from './dto/course-pagination.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { GradeLevel } from '../grade-level/entities/grade-level.entity';
import { User, UserRole } from 'src/modules/users/entities/user.entity';
import { paginateResponse } from 'src/common/helpers/pagination-response';
import { UserPayload } from 'src/auth/decorators/current-user.decorator';
import { EnrollmentStatus } from 'src/modules/enrollments/entities/enrollment.entity';

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

  // courses.service.ts
  async findAll(pagination: CoursePagination, user: UserPayload) {
    switch (user.role) {
      case UserRole.ADMIN:
        return this.findAllCourses(pagination);
      case UserRole.INSTRUCTOR:
        return this.findCoursesByInstructor(user.id, pagination);
      case UserRole.STUDENT:
        return this.findCoursesByEnrollment(user.id, pagination);
      default:
        throw new ForbiddenException('Invalid role');
    }
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

  // findOne(id: string) {
  //   return this.courseRepository.findOne({
  //     where: { id },
  //     relations: ['gradeLevel', 'instructor']
  //   });
  // }

  // métodos
  private async findAllCourses(pagination: CoursePagination) {
    const { page = 1, limit = 10, orderBy, order, search } = pagination;
    const skip = (page - 1) * limit;
    const keyword = search ? `%${search}%` : '%%';

    const [data, total] = await this.courseRepository.findAndCount({
      where: [{ name: ILike(keyword) }],
      relations: ['gradeLevel', 'instructor'],
      take: limit,
      skip,
      order: orderBy && order ? { [orderBy]: order } : { createdAt: 'DESC' },
    });

    return paginateResponse({
      data,
      total,
      page,
      limit,
      route: `${process.env.API_BASE_URL}/courses`,
    });
  }

  // async findAll(pagination: CoursePagination) {
  //   const { page = 1, limit = 10, orderBy, order, search } = pagination;
  //   const skip = (page - 1) * limit;
  //   const keyword = search ? `%${search}%` : '%%';

  //   const [data, total] = await this.courseRepository.findAndCount({
  //     where: [
  //       { name: ILike(keyword) },
  //     ],
  //     relations: ['gradeLevel', 'instructor'],
  //     take: limit,
  //     skip: skip,
  //     order: orderBy && order ? { [orderBy]: order } : { createdAt: 'DESC' },
  //   });
  //   return paginateResponse({ data, total, page, limit, route: `${process.env.API_BASE_URL}/courses` });
  // }

  private async findCoursesByEnrollment(studentId: string, pagination: CoursePagination) {
    const { page = 1, limit = 10, orderBy, order, search } = pagination;
    const skip = (page - 1) * limit;
    const keyword = search ? `%${search}%` : '%%';

    const [data, total] = await this.courseRepository.findAndCount({
      where: { enrollments: { userId: studentId }, name: ILike(keyword) },
      relations: ['gradeLevel', 'instructor', 'enrollments'],
      take: limit,
      skip,
      order: orderBy && order ? { [orderBy]: order } : { createdAt: 'DESC' },
    });


    return paginateResponse({
      data,
      total,
      page,
      limit,
      route: `${process.env.API_BASE_URL}/courses`,
    });
  }

  async findMyCoursesActive(userId: string, role: UserRole) {
    if (role !== UserRole.INSTRUCTOR) {
      throw new Error('Only instructors can access this endpoint');
    }
    const courses = await this.courseRepository.find({ where: { instructorId: userId, status: CourseStatus.PUBLISHED } });
    return courses;
  }

  private async findCoursesByInstructor(instructorId: string, pagination: CoursePagination) {
    const { page = 1, limit = 10, orderBy, order, search } = pagination;
    const skip = (page - 1) * limit;
    const keyword = search ? `%${search}%` : '%%';

    const [data, total] = await this.courseRepository.findAndCount({
      where: [
        {
          name: ILike(keyword),
          instructorId,
        },
      ],
      relations: ['gradeLevel', 'instructor'],
      take: limit,
      skip,
      order: orderBy && order ? { [orderBy]: order } : { createdAt: 'DESC' },
    });

    return paginateResponse({
      data,
      total,
      page,
      limit,
      route: `${process.env.API_BASE_URL}/courses`,
    });
  }


  async findOne(id: string, userId: string, userRoles: UserRole): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['gradeLevel', 'instructor', 'enrollments']
      //relations: ['gradeLevel','instructor', 'modules', 'assignments', 'enrollments'],
    });

    if (!course) {
      throw new NotFoundException(`Course with ID "${id}" not found`);
    }

    this.checkCourseAccess(course, userId, userRoles);
    return course;
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


  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const course = await this.findOne(id, userId, userRole);
    if (course.instructorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this course');
    }
    await this.courseRepository.remove(course);
  }

  async publish(id: string, userId: string, userRole: UserRole): Promise<Course> {
    const course = await this.findOne(id, userId, userRole);
    if (course.instructorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to publish this course');
    }
    course.status = CourseStatus.PUBLISHED;
    return this.courseRepository.save(course);
  }

  private checkCourseAccess(course: Course, userId: string, userRole: UserRole): void {
    if (userRole === UserRole.ADMIN || course.instructorId === userId || course.enrollments.some(e => e.userId === userId)) {
      return;
    }

    if (course.enrollments.some(e => e.userId === userId) && course.status !== CourseStatus.PUBLISHED) {
      throw new ForbiddenException('No tienes acceso a este curso');
    }
  }
}
