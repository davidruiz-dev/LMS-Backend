import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Module } from 'src/modules/modules/entities/module.entity';
import { Repository } from 'typeorm';
import { Lesson } from 'src/modules/lessons/entities/lesson.entity';
import { Course } from 'src/modules/courses/entities/course.entity';
import { UserRole } from 'src/modules/users/entities/user.entity';
import { CreateLessonDto } from 'src/modules/lessons/dto/create-lesson.dto';
import { UpdateLessonDto } from 'src/modules/lessons/dto/update-lesson.dto';
import { ReorderLessonsDto } from 'src/modules/modules/dto/reorder-lessons.dto';
import { ReorderModulesDto } from 'src/modules/modules/dto/reorder-modules.dto';

@Injectable()
export class ModulesService {
  constructor(
    @InjectRepository(Module)
    private modulesRepository: Repository<Module>,
    @InjectRepository(Lesson)
    private lessonsRepository: Repository<Lesson>,
    @InjectRepository(Course)
    private coursesRepository: Repository<Course>,
  ) { }

  async create(courseId: string, createModuleDto: CreateModuleDto, userId: string, userRoles: UserRole): Promise<Module> {
    const course = await this.coursesRepository.findOne({ where: { id: courseId } });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.instructorId !== userId && userRoles !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to create modules in this course');
    }

    // Si no se especifica posición, obtener la última
    if (createModuleDto.position === undefined) {
      const lastModule = await this.modulesRepository.findOne({
        where: { courseId },
        order: { position: 'DESC' },
      });
      createModuleDto.position = lastModule ? lastModule.position + 1 : 0;
    }

    const module = this.modulesRepository.create({
      ...createModuleDto,
      courseId,
    });

    return this.modulesRepository.save(module);
  }

  async findAllByCourse(courseId: string): Promise<Module[]> {
    return this.modulesRepository.find({
      where: { courseId },
      relations: ['lessons'],
      order: { position: 'ASC', lessons: { position: 'ASC' } },
    })
  }

  async findOne(id: string) {
    const module = await this.modulesRepository.findOne({
      where: { id },
      relations: ['lessons', 'course'],
    });

    if (!module) {
      throw new NotFoundException(`Module with ID "${id}" not found`);
    }

    return module;
  }

  async update(id: string, updateModuleDto: UpdateModuleDto, userId: string, userRoles: UserRole): Promise<Module> {
    const module = await this.findOne(id);
    const course = await this.coursesRepository.findOne({ where: { id: module.courseId } });

    if (course?.instructorId !== userId && userRoles !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this module');
    }

    Object.assign(module, updateModuleDto);
    return this.modulesRepository.save(module);
  }

  async remove(id: string, userId: string, userRoles: UserRole): Promise<void> {
    const module = await this.findOne(id);
    const course = await this.coursesRepository.findOne({ where: { id: module.courseId } });

    if (course?.instructorId !== userId && userRoles !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this module');
    }
    await this.modulesRepository.remove(module);
  }

  async reorderModules(courseId: string, reorderDto: ReorderModulesDto, userId: string, userRoles: UserRole): Promise<Module[]> {
    const course = await this.coursesRepository.findOne({ where: { id: courseId } });

    if (course?.instructorId !== userId && userRoles !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to reorder items');
    }

    // Actualizar posiciones de los módulos
    const updates = reorderDto.modules.map((module) => 
      this.modulesRepository.update(module.id, { position: module.position })
    );

    await Promise.all(updates);

    return this.findAllByCourse(courseId);
  }



  // lessons
  async createLesson(moduleId: string, createItemDto: CreateLessonDto, userId: string, userRoles: UserRole): Promise<Lesson> {
    const module = await this.findOne(moduleId);
    const course = await this.coursesRepository.findOne({ where: { id: module.courseId } });

    if (course?.instructorId !== userId && userRoles !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to create items in this module');
    }

    // Si no se especifica posición, obtener la última
    if (createItemDto.position === undefined) {
      const lastItem = await this.lessonsRepository.findOne({
        where: { moduleId },
        order: { position: 'DESC' },
      });
      createItemDto.position = lastItem ? lastItem.position + 1 : 0;
    }

    const item = this.lessonsRepository.create({
      ...createItemDto,
      moduleId,
    });

    return this.lessonsRepository.save(item);
  }

  async findAllLessonsByModule(moduleId: string): Promise<Lesson[]> {
    return this.lessonsRepository.find({
      where: { moduleId },
      order: { position: 'ASC' },
    });
  }

  async findOneLesson(id: string): Promise<Lesson> {
    const item = await this.lessonsRepository.findOne({
      where: { id },
      relations: ['module', 'module.course'],
    });

    if (!item) {
      throw new NotFoundException(`Module item with ID "${id}" not found`);
    }

    return item;
  }

  async updateLesson(id: string, updateItemDto: UpdateLessonDto, userId: string, userRoles: UserRole): Promise<Lesson> {
    const item = await this.findOneLesson(id);
    const course = await this.coursesRepository.findOne({ where: { id: item.module.courseId } });

    if (course?.instructorId !== userId && userRoles !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this item');
    }

    Object.assign(item, updateItemDto);
    return this.lessonsRepository.save(item);
  }

  async removeLesson(id: string, userId: string, userRoles: UserRole): Promise<void> {
    const item = await this.findOneLesson(id);
    const course = await this.coursesRepository.findOne({ where: { id: item.module.courseId } });

    if (course?.instructorId !== userId && userRoles !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this item');
    }

    await this.lessonsRepository.remove(item);
  }

  async reorderLessons(moduleId: string, reorderDto: ReorderLessonsDto, userId: string, userRoles: UserRole): Promise<Lesson[]> {
    const module = await this.findOne(moduleId);
    const course = await this.coursesRepository.findOne({ where: { id: module.courseId } });

    if (course?.instructorId !== userId && userRoles !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to reorder items');
    }

    // Verificar que todos los items pertenezcan al módulo
    const items = await this.lessonsRepository.findByIds(reorderDto.itemIds);
    
    if (items.length !== reorderDto.itemIds.length) {
      throw new BadRequestException('Some items were not found');
    }

    if (items.some(item => item.moduleId !== moduleId)) {
      throw new BadRequestException('All items must belong to the same module');
    }

    // Actualizar posiciones
    const updates = reorderDto.itemIds.map((id, index) => 
      this.lessonsRepository.update(id, { position: index })
    );

    await Promise.all(updates);

    return this.findAllLessonsByModule(moduleId);
  }


  
}
