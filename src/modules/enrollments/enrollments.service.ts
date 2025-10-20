import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Enrollment } from './entities/enrollment.entity';
import { Repository } from 'typeorm';
import { Course } from 'src/modules/courses/entities/course.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Injectable()
export class EnrollmentsService {
  @InjectRepository(Enrollment)
  private readonly enrollmentRepository: Repository<Enrollment>
  @InjectRepository(Course)
  private readonly courseRepository: Repository<Course>
  @InjectRepository(User)
  private readonly userRepository: Repository<User>

  async create(createEnrollmentDto: CreateEnrollmentDto) {
    const enrollmentExists = await this.enrollmentRepository.findOne({
      where: { user: { id: createEnrollmentDto.userId }, course: { id: createEnrollmentDto.courseId}},
      relations: ['course', 'user']
    })
    if( enrollmentExists ){
      throw new Error('Ya existe una matricula')
    }
    const course = await this.courseRepository.findOne({where: {id: createEnrollmentDto.courseId}});
    if (!course) throw new NotFoundException('Course not found');
    const user = await this.userRepository.findOne({where: {id: createEnrollmentDto.userId}});
    if (!user) throw new NotFoundException('user not found');

    const enrollment = this.enrollmentRepository.create({
      course,
      user
    })
    return await this.enrollmentRepository.save(enrollment);
  }

  findAll() {
    return `This action returns all enrollments`;
  }

  async findAllEnrolledCoursesByUser(userId: string){
    const enrollments = await this.enrollmentRepository.find({
      where: { user: { id: userId} },
      relations: ['user', 'course', 'course.gradeLevel', 'course.instructor']
    })
    return enrollments.map(enrollment => enrollment.course)
  }

  async findEnrolledActiveCoursesByUser(userId: string){
    const enrollments = await this.enrollmentRepository.find({
      where: { user: { id: userId} },
      relations: ['user', 'course', 'course.gradeLevel', 'course.instructor']
    })
    return enrollments.map(enrollment => enrollment.course)
  }

  async getEnrollmentsByCourseId(id: string): Promise<Enrollment[]>{
    const enrollments = await this.enrollmentRepository.find({
      relations: ['course', 'user'],
      where: {
        course: { id}
      }
    })
    return enrollments;
  }

  findOne(id: string) {
    return `This action returns a #${id} enrollment`;
  }

  update(id: number, updateEnrollmentDto: UpdateEnrollmentDto) {
    return `This action updates a #${id} enrollment`;
  }

  remove(id: number) {
    return `This action removes a #${id} enrollment`;
  }
}
