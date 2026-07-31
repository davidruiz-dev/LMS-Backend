import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Module } from 'src/modules/modules/entities/module.entity';
import { Repository } from 'typeorm';
import { Course } from 'src/modules/courses/entities/course.entity';
import { UserRole } from 'src/modules/users/entities/user.entity';
import { ReorderModulesDto } from 'src/modules/modules/dto/reorder-modules.dto';
import { ModuleItem } from 'src/modules/modules/entities/module-item.entity';
import { CreateModuleItemDto } from 'src/modules/modules/dto/create-module-item.dto';
import { ReorderModuleItemsDto } from 'src/modules/modules/dto/reorder-module-items.dto';
import { UpdateModuleItemDto } from 'src/modules/modules/dto/update-module-item.dto';

@Injectable()
export class ModulesService {
  constructor(
    @InjectRepository(Module)
    private modulesRepository: Repository<Module>,
    @InjectRepository(ModuleItem)
    private moduleItemsRepository: Repository<ModuleItem>,
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
      order: { position: 'ASC', items: { position: 'ASC' } },
    })
  }

  async findOne(courseId: string, id: string) {
    const module = await this.modulesRepository.findOne({
      where: { id, courseId }
    });

    if (!module) {
      throw new NotFoundException(`Module not found`);
    }

    return module;
  }

  async update(id: string, updateModuleDto: UpdateModuleDto, userId: string, role: UserRole): Promise<Module> {
    const module = await this.modulesRepository.findOneBy({id})
    if (!module) {
      throw new NotFoundException(`Module with ID "${id}" not found`);
    }
    const course = await this.coursesRepository.findOne({ where: { id: module.courseId } });

    if (course?.instructorId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this module');
    }

    Object.assign(module, updateModuleDto);
    return this.modulesRepository.save(module);
  }

  async remove(courseId: string, moduleId: string, userId: string, userRoles: UserRole): Promise<void> {
    const module = await this.findOne(courseId, moduleId);
    const course = await this.coursesRepository.findOne({ where: { id: courseId } });
    if (course?.instructorId !== userId && userRoles !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this module');
    }
    await this.modulesRepository.remove(module);
  }

  async reorderModules(courseId: string, reorderDto: ReorderModulesDto, userId: string, userRole: UserRole): Promise<Module[]> {
    const course = await this.coursesRepository.findOne({ where: { id: courseId } });

    if (!course) {
      throw new NotFoundException(`Course not found`);
    }

    if (course.instructorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to reorder modules');
    }

    // Verificar que todos los módulos pertenezcan al curso
    const modules = await this.modulesRepository.findByIds(reorderDto.moduleIds);
    
    if (modules.length !== reorderDto.moduleIds.length) {
      throw new BadRequestException('Some modules were not found');
    }

    if (modules.some(module => module.courseId !== courseId)) {
      throw new BadRequestException('All modules must belong to the same course');
    }

    // Actualizar posiciones
    const updates = reorderDto.moduleIds.map((id, index) => 
      this.modulesRepository.update(id, { position: index })
    );

    await Promise.all(updates);

    return this.findAllByCourse(courseId);
  }

  // Items
  async createItem(courseId: string, moduleId: string, createItemDto: CreateModuleItemDto, userId: string, userRoles: UserRole): Promise<ModuleItem> {
    const module = await this.findOne(courseId, moduleId);
    const course = await this.coursesRepository.findOne({ where: { id: module.courseId } });

    if (course?.instructorId !== userId && userRoles !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to create items in this module');
    }

    // Si no se especifica posición, obtener la última
    if (createItemDto.position === undefined) {
      const lastItem = await this.moduleItemsRepository.findOne({
        where: { moduleId },
        order: { position: 'DESC' },
      });
      createItemDto.position = lastItem ? lastItem.position + 1 : 0;
    }

    const item = this.moduleItemsRepository.create({
      ...createItemDto,
      moduleId,
    });

    return this.moduleItemsRepository.save(item);
  }

  async findAllItemsByModule(courseId: string, moduleId: string): Promise<ModuleItem[]> {
    return this.moduleItemsRepository.find({
      where: { moduleId, module: {courseId} },
      order: { position: 'ASC' },
      relations: ['module']
    });
  }

  async findOneItem(courseId: string, moduleId: string, id: string): Promise<ModuleItem> {
    const item = await this.moduleItemsRepository.findOne({
      where: { id , moduleId, module: { courseId } },
      relations: ['module'],
    });

    if (!item) {
      throw new NotFoundException(`Module item not found`);
    }

    return item;
  }

  async updateItem(courseId: string, moduleId: string, id: string, updateItemDto: UpdateModuleItemDto, userId: string, userRoles: UserRole): Promise<ModuleItem> {
    const item = await this.findOneItem(courseId,moduleId, id);
    const course = await this.coursesRepository.findOne({ where: { id: item.module.courseId } });

    if (course?.instructorId !== userId && userRoles !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this item');
    }

    Object.assign(item, updateItemDto);
    return this.moduleItemsRepository.save(item);
  }

  async removeItem(courseId: string, moduleId: string, id: string, userId: string, userRole: UserRole): Promise<void> {
    const item = await this.findOneItem(courseId, moduleId, id);
    const course = await this.coursesRepository.findOne({ where: { id: courseId } });

    if (course?.instructorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this item');
    }

    await this.moduleItemsRepository.remove(item);
  }

  async reorderItems(courseId: string, moduleId: string, reorderDto: ReorderModuleItemsDto, userId: string, userRoles: UserRole): Promise<ModuleItem[]> {
    const module = await this.findOne(courseId, moduleId);
    const course = await this.coursesRepository.findOne({ 
      where: { id: module.courseId },
    });

    if (course?.instructorId !== userId && userRoles !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to reorder items');
    }

    // Verificar que todos los items pertenezcan al módulo
    const items = await this.moduleItemsRepository.findByIds(reorderDto.itemIds);
    
    if (items.length !== reorderDto.itemIds.length) {
      throw new BadRequestException('Some items were not found');
    }

    if (items.some(item => item.moduleId !== moduleId)) {
      throw new BadRequestException('All items must belong to the same module');
    }

    // Actualizar posiciones
    const updates = reorderDto.itemIds.map((id, index) => 
      this.moduleItemsRepository.update(id, { position: index })
    );

    await Promise.all(updates);

    return this.findAllItemsByModule(courseId, moduleId);
  }
  
}
