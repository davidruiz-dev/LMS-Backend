import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Course, CourseStatus } from './entities/course.entity';
import { ILike, Repository } from 'typeorm';
import { CoursePagination } from './dto/course-pagination.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { User, UserRole } from 'src/modules/users/entities/user.entity';
import { paginateResponse } from 'src/common/helpers/pagination-response';
import { UserPayload } from 'src/auth/decorators/current-user.decorator';
import { Enrollment, EnrollmentStatus } from 'src/modules/enrollments/entities/enrollment.entity';
import { CourseDetailDto } from './dto/course-detail.dto';
import { plainToInstance } from 'class-transformer';
import { checkCourseAccess } from './utils/checkCourseAccess';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private cloudinaryService: CloudinaryService,
  ) { }

  async create(createCourseDto: CreateCourseDto, imagen: Express.Multer.File) {
    const newCourse = this.courseRepository.create(createCourseDto);
    // instructor
    const instructor = await this.userRepository.findOneBy({ id: createCourseDto.instructorId });
    if (!instructor) throw new Error('instructor not found');

    newCourse.instructor = instructor;
    if (imagen) {
      const cloudinaryResponse = await this.cloudinaryService.uploadImage(
        imagen,
        `cursos/${createCourseDto.name}`
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
  //     .leftJoinAndSelect('course.gradeLevel',   //     .withDeleted();
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
  //     relations: ['instructor']
  //   });
  // }

  // métodos
  private async findAllCourses(pagination: CoursePagination) {
    const { page = 1, limit = 10, orderBy, order, search } = pagination;
    const skip = (page - 1) * limit;
    const keyword = search ? `%${search}%` : '%%';

    const [data, total] = await this.courseRepository.findAndCount({
      where: [{ name: ILike(keyword) }],
      relations: ['instructor'],
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
  //     relations: ['instructor'],
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
      relations: ['instructor', 'enrollments'],
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
      relations: ['instructor'],
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
      relations: ['instructor', 'enrollments']
      //relations: [instructor', 'modules', 'assignments', 'enrollments'],
    });

    if (!course) {
      throw new NotFoundException(`Course with ID "${id}" not found`);
    }

    checkCourseAccess(course, userId, userRoles);
    return course;
  }

  async findOneWithStats(courseId: string, userId: string, userRole: UserRole): Promise<CourseDetailDto> {
    const course = await this.courseRepository.findOneOrFail({
      where: { id: courseId },
      relations: ['enrollments', 'instructor']
    });
    checkCourseAccess(course, userId, userRole);

    const courseStat = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoin('course.assignments', 'assignment')
      .leftJoin('course.modules', 'module')
      .leftJoin('course.enrollments', 'enrollment')
      .select([
        'COUNT(DISTINCT assignment.id) AS "assignmentsCount"',
        'COUNT(DISTINCT module.id) AS "modulesCount"',
        'COUNT(DISTINCT enrollment.id) AS "enrollmentsCount"',
      ])
      .where('course.id = :courseId', { courseId })
      .getRawOne();

    return {
      ...course,
      assignmentsCount: Number(courseStat?.assignmentsCount ?? 0),
      modulesCount: Number(courseStat?.modulesCount ?? 0),
      enrollmentsCount: Number(courseStat?.enrollmentsCount ?? 0),
    };
  }

  async update(id: string, updateCourseDto: UpdateCourseDto, imagen?: Express.Multer.File) {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['instructor'],
    });

    if (!course) {
      throw new Error('Course not found');
    }

    // Actualizar campos simples del DTO
    Object.assign(course, updateCourseDto);

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
        `cursos/${course.name}`
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
    await this.courseRepository.softRemove(course);
  }

  async publish(id: string, userId: string, userRole: UserRole): Promise<Course> {
    const course = await this.findOne(id, userId, userRole);
    if (course.instructorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to publish this course');
    }
    course.status = CourseStatus.PUBLISHED;
    return this.courseRepository.save(course);
  }



  async getEnrollmentsByCourseId(courseId: string, currentUser: UserPayload): Promise<Enrollment[]> {
    // 1. Verificar que el curso exista
    const course = await this.courseRepository.findOne({
      where: {
        id: courseId,
      },
    });

    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    // 2. Admin puede acceder
    if (currentUser.role !== UserRole.ADMIN) {

      // 3. Profesor propietario
      const isTeacher = course.instructorId === currentUser.id;

      // 4. Alumno inscrito
      const isStudent = await this.enrollmentRepository.exists({
        where: {
          course: {
            id: courseId,
          },
          user: {
            id: currentUser.id,
          },
        },
      });

      if (!isTeacher && !isStudent) {
        throw new ForbiddenException(
          'No tienes permisos para ver los compañeros de este curso',
        );
      }
    }

    // 5. Obtener únicamente la información pública
    const enrollments = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.user', 'user')
      .select([
        'enrollment.id',
        'enrollment.createdAt',
        'enrollment.status',
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.avatarUrl',
        'user.email',
      ])
      .where(
        'enrollment.courseId = :courseId',
        { courseId },
      )
      .orderBy(
        'user.lastName',
        'ASC',
      )
      .getMany();

    return enrollments;
  }
}
