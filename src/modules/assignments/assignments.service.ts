import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Assignment } from 'src/modules/assignments/entities/assignment.entity';
import { Repository } from 'typeorm';
import { UserRole } from 'src/modules/users/entities/user.entity';
import { Course } from 'src/modules/courses/entities/course.entity';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Course)
    private coursesRepository: Repository<Course>,
  ){}

  async create(courseId: string, createAssignmentDto: CreateAssignmentDto, userId: string, role: UserRole) {
    const course = await this.coursesRepository.findOneBy({id: courseId});

    if(!course){
      throw new NotFoundException();
    }

    if(course?.instructorId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }

    const assignment = await this.assignmentRepository.create({
      ...createAssignmentDto,
      courseId
    })

    return this.assignmentRepository.save(assignment);
  }

  async findAll(courseId: string, userId: string, role: UserRole) {
    const course = await this.coursesRepository.findOne({ where: { id: courseId } });

    if (course?.instructorId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
    
    const assignments = await this.assignmentRepository.find({
      where: { courseId }
    })
    return assignments;
  }

  async findOne(courseId: string, id: string,userId: string, role: UserRole) {
    const course = await this.coursesRepository.findOne({ where: { id: courseId } });

    if (course?.instructorId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
    
    const assignment = await this.assignmentRepository.findOne({
      where: { id, courseId },
      relations: ['course']
    })
    return assignment;
  }

  update(id: number, updateAssignmentDto: UpdateAssignmentDto) {
    return `This action updates a #${id} assignment`;
  }

  remove(id: number) {
    return `This action removes a #${id} assignment`;
  }
}
