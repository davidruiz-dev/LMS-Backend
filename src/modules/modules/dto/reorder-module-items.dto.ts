import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderModuleItemsDto {
  @ApiProperty({ description: 'Array of item IDs in the desired order. Position will be assigned based on array index.'})
  @IsArray()
  @IsUUID()
  itemIds: string[];
}