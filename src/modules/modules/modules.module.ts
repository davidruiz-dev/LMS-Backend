import { Module } from '@nestjs/common';
import { ModulesService } from './modules.service';
import { ModulesController } from './modules.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from 'src/modules/courses/entities/course.entity';
import { Module as ModuleEntity } from 'src/modules/modules/entities/module.entity';
import { ModuleItem } from 'src/modules/modules/entities/module-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Course, ModuleEntity, ModuleItem]),],
  controllers: [ModulesController],
  providers: [ModulesService],
})
export class ModulesModule {}
