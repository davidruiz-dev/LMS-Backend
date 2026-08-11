import { Injectable } from "@nestjs/common";
import { UsersService } from "./modules/users/users.service";
import { UserRole } from "./modules/users/entities/user.entity";

@Injectable()
export class SeederService {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  async seedAdmin() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
    }

    const existingAdmin =
      await this.usersService.findOneByEmail(email);

    if (existingAdmin) {
      console.log('Admin already exists');
      return;
    }

    await this.usersService.create({
      firstName: 'Admin',
      lastName: 'Admin',
      email,
      password,
      role: UserRole.ADMIN,
    });

    console.log('Admin user created');
  }
}