import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
import { ModulesService } from './modules.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/modules/users/entities/user.entity';
import { CurrentUser, UserPayload } from 'src/auth/decorators/current-user.decorator';
import { ReorderModulesDto } from 'src/modules/modules/dto/reorder-modules.dto';
import { CreateModuleItemDto } from 'src/modules/modules/dto/create-module-item.dto';
import { ReorderModuleItemsDto } from 'src/modules/modules/dto/reorder-module-items.dto';

@Controller('courses/:courseId/modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) { }

  @Post()
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  create(
    @Param('courseId') courseId: string,
    @Body() createModuleDto: CreateModuleDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.modulesService.create(courseId, createModuleDto, user.id, user.role);
  }

  @Get()
  findAll(@Param('courseId') courseId: string) {
    return this.modulesService.findAllByCourse(courseId);
  }

  @Get(':id')
  findOne(@Param('courseId') courseId: string, @Param('id') id: string) {
    return this.modulesService.findOne(courseId, id);
  }

  @Patch(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateModuleDto: UpdateModuleDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.modulesService.update(id, updateModuleDto, user.id, user.role);
  }

  @Delete(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async remove(
    @Param('courseId') courseId: string,
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.modulesService.remove(courseId, id, user.id, user.role);
  }

  @Post('reorder')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  reorderModules(
    @Param('courseId') courseId: string,
    @Body() reorderDto: ReorderModulesDto,
    @CurrentUser() user: UserPayload,
  ) {
    console.log(reorderDto);
    return this.modulesService.reorderModules(courseId, reorderDto, user.id, user.role);
  }


  // Module items endpoints
  @Get(':moduleId/items')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.STUDENT)
  async createItem(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.modulesService.findAllItemsByModule(courseId, moduleId);
  }

  @Post(':moduleId/items')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  createModuleItem(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Body() createItemDto: CreateModuleItemDto,
    @CurrentUser() user: UserPayload,
  ){
    return this.modulesService.createItem(courseId, moduleId, createItemDto, user.id, user.role);
  }

  @Delete(':moduleId/items/:id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async deleteItem(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ){
    return this.modulesService.removeItem(courseId, moduleId, id, user.id, user.role)
  }

  @Post(':moduleId/items/reorder')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async reorderItems(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Body() reorderDto: ReorderModuleItemsDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.modulesService.reorderItems(courseId, moduleId, reorderDto, user.id, user.role);
  }
}
