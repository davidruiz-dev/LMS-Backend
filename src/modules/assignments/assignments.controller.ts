import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { CurrentUser, UserPayload } from 'src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/modules/users/entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('courses/:courseId/assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @Post()
  create(
    @Param('courseId') courseId: string,
    @CurrentUser() user: UserPayload,
    @Body() createAssignmentDto: CreateAssignmentDto
  ) {
    return this.assignmentsService.create(courseId, createAssignmentDto, user.id, user.role);
  }

  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.STUDENT)
  @Get()
  findAll(
    @Param('courseId') courseId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.assignmentsService.findAll(courseId, user.id, user.role);
  }

  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.STUDENT)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Param('courseId') courseId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.assignmentsService.findOne(courseId,id, user.id, user.role);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAssignmentDto: UpdateAssignmentDto) {
    return this.assignmentsService.update(+id, updateAssignmentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assignmentsService.remove(+id);
  }
}
