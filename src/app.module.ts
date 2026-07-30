import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module'; 
import { CoursesModule } from './modules/courses/courses.module';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './modules/comments/comments.module';
import { PostsModule } from './modules/posts/posts.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { GradeLevelModule } from './modules/grade-level/grade-level.module';
import { ConfigModule } from '@nestjs/config';
import { ModulesModule } from 'src/modules/modules/modules.module';
import { AssignmentsModule } from 'src/modules/assignments/assignments.module';
import { AnnouncementsModule } from 'src/modules/announcements/announcements.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    UsersModule,
    CoursesModule,
    AuthModule,
    CommentsModule,
    PostsModule,
    EnrollmentsModule,
    GradeLevelModule,
    ModulesModule,
    AssignmentsModule,
    AnnouncementsModule,
    QuizzesModule,
    SubmissionsModule,
    DashboardModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
