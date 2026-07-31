import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderModulesDto {
  @ApiProperty({ example: ['uuid1', 'uuid2', 'uuid3'], description: 'Array of module IDs in desired order' })
  @IsArray()
  @IsUUID()
  moduleIds: string[];
}