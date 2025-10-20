import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "src/common/dto/pagination.dto";

export class CoursePagination extends PaginationDto {
    @IsString()
    name?: string
    @IsString()
    @IsOptional()
    orderBy?: string = 'createdAt';
    @IsString()
    @IsOptional()
    order?: 'ASC' | 'DESC' = 'ASC';
    search: string;
}