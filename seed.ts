import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { UsersService } from 'src/modules/users/users.service';
import { UserRole } from 'src/modules/users/entities/user.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService = app.get(UsersService);

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  }
  const existingAdmin = await usersService.findOneByEmail(email);

  if (!existingAdmin) {
    await usersService.create({
      firstName: 'Admin',
      lastName: 'Admin',
      email: email,
      password: password,
      role: UserRole.ADMIN,
    });
    console.log('Admin user created');
  } else {
    console.log('Admin already exists');
  }

  await app.close();
}

bootstrap();
