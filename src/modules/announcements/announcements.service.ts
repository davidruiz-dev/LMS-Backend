import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from 'src/modules/announcements/entities/announcement.entity';
import { Course } from 'src/modules/courses/entities/course.entity';
import { UserRole } from 'src/modules/users/entities/user.entity';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcementsRepository: Repository<Announcement>,
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
  ) { }

  private validateInstructor(course: Course, userId: string, role: UserRole) {
    if (course.instructorId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
  }

  private async existsCourse(courseId: string) {
    const course = await this.coursesRepository.findOneBy({ id: courseId });
    if (!course) throw new NotFoundException();
    return course;
  }

  async create(courseId: string, createAnnouncementDto: CreateAnnouncementDto, userId: string, role: UserRole) {
    const course = await this.existsCourse(courseId);
    this.validateInstructor(course, userId, role);

    const announcement = this.announcementsRepository.create({
      ...createAnnouncementDto,
      courseId,
      authorId: userId
    });

    return this.announcementsRepository.save(announcement);
  }

  async findAll(courseId: string, userId: string, role: UserRole) {
    const course = await this.existsCourse(courseId);
    const isInstructor = course.instructorId === userId || role === UserRole.ADMIN
    const queryBuilder = this.announcementsRepository.createQueryBuilder('announcement')
      .where('announcement.courseId = :courseId', { courseId })
      .innerJoinAndSelect('announcement.author', 'author');

    if(!isInstructor){
      queryBuilder.andWhere('announcement.isPublished = :published', { published: true });
    }
    
    return queryBuilder.orderBy('announcement.createdAt', 'DESC').getMany();
  }


  async update(
    courseId: string, 
    id: string, 
    updateAnnouncementDto: UpdateAnnouncementDto,
    userId: string,
    role: UserRole) 
  {
    const course = await this.existsCourse(courseId);
    this.validateInstructor(course, userId, role);

    const announcement = await this.announcementsRepository.findOneBy({id});
    if(!announcement) throw new NotFoundException()

    Object.assign(announcement, updateAnnouncementDto);
    return await this.announcementsRepository.save(announcement);
  }

  async remove(courseId: string, id: string, userId: string, role: UserRole) {
    const course = await this.existsCourse(courseId);
    this.validateInstructor(course, userId, role);

    const announcement = await this.announcementsRepository.findOneBy({id});
    if(!announcement) throw new NotFoundException();

    return await this.announcementsRepository.remove(announcement);
  }
}
