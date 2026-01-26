import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { UsersService } from 'src/modules/users/users.service';
import { UserRole } from 'src/modules/users/entities/user.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService = app.get(UsersService);

  const existingAdmin = await usersService.findOneByEmail('admin@example.com');

  if (!existingAdmin) {
    await usersService.create({
      firstName: 'Admin',
      lastName: 'Admin',
      email: 'admin@example.com',
      password: 'securePassword123', 
      role: UserRole.ADMIN,
    });
    console.log('Admin user created');
  } else {
    console.log('ℹAdmin already exists');
  }

  await app.close();
}

bootstrap();
