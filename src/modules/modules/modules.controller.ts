import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
import { ModulesService } from './modules.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/modules/users/entities/user.entity';
import { CurrentUser, UserPayload } from 'src/auth/decorators/current-user.decorator';
import { ReorderModulesDto } from 'src/modules/modules/dto/reorder-modules.dto';

@Controller('courses/:courseId/modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

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
  findOne(@Param('id') id: string) {
    return this.modulesService.findOne(id);
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
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.modulesService.remove(id, user.id, user.role);
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


  // Module lessons endpoints
}
