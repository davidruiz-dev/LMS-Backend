import { IsNotEmpty, IsString } from "class-validator"
import { UserRole } from "../entities/user.entity"

export class CreateUserDto {
    @IsNotEmpty()
    @IsString()
    firstName: string;
    @IsNotEmpty()
    @IsString()
    lastName: string
    @IsNotEmpty()
    @IsString()
    email: string;
    @IsNotEmpty()
    @IsString()
    password: string;
    // dni: string
    @IsNotEmpty()
    role: UserRole;
}
