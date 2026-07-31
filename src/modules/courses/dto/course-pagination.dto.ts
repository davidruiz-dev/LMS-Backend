import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "src/common/dto/pagination.dto";

export class CoursePagination extends PaginationDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsString()
    @IsOptional()
    orderBy?: string = 'createdAt';

    @IsString()
    @IsOptional()
    order?: 'ASC' | 'DESC' = 'ASC';
    
    @IsOptional()
    @IsString()
    search?: string;
}