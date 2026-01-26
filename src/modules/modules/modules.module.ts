import { Module } from '@nestjs/common';
import { ModulesService } from './modules.service';
import { ModulesController } from './modules.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from 'src/modules/courses/entities/course.entity';
import { Lesson } from 'src/modules/lessons/entities/lesson.entity';
import { Module as ModuleEntity } from 'src/modules/modules/entities/module.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Course, ModuleEntity, Lesson]),],
  controllers: [ModulesController],
  providers: [ModulesService],
})
export class ModulesModule {}
