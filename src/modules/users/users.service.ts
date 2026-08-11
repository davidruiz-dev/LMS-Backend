import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from './entities/user.entity';
import { ILike, Not, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserPaginationDto } from './dto/user-pagination.dto';
import { paginateResponse } from 'src/common/helpers/pagination-response';
import { ConfigService } from '@nestjs/config';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: [
        { email: createUserDto.email },
      ],
    });
    if (existingUser) {
      throw new Error('User with this email or dni already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const newUser = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    })

    return this.userRepository.save(newUser);
  }

  async findAll(userPagination: UserPaginationDto) {
    const { page = 1, limit = 10, orderBy, order, search } = userPagination;
    const skip = (page - 1) * limit;
    const keyword = search ? `%${search}%` : '%%';

    const [data, total] = await this.userRepository.findAndCount({
      where: [
        { email: ILike(keyword), role: Not(UserRole.ADMIN) },
        { lastName: ILike(keyword), role: Not(UserRole.ADMIN) },
      ],
      take: limit,
      skip: skip,
      order: orderBy && order ? { [orderBy]: order } : { createdAt: 'DESC' },
    });
    return paginateResponse({ data, total, page, limit, route: `${process.env.API_BASE_URL}/users` });
  }


  async findOneByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email: email },
    });
  }

  async findInstructorByEmail(email: string): Promise<User[]> {
    if (email && email.trim() !== '') {
      return this.userRepository.find({
        where: { email: ILike(`%${email}%`), role: UserRole.INSTRUCTOR }
      });
    }

    return this.userRepository.find({
      where: { role: UserRole.INSTRUCTOR },
      order: { createdAt: 'ASC' },
      take: 7
    });
  }

  async findStudentsByEmail(
    courseId: string,
    email: string,
): Promise<User[]> {
  const query = this.userRepository
    .createQueryBuilder('user')
    .where('user.role = :role', {
      role: UserRole.STUDENT,
    })
    .andWhere('user.isActive = :isActive', {
      isActive: true,
    })
    .andWhere((qb) => {
      const subQuery = qb
        .subQuery()
        .select('1')
        .from(Enrollment, 'enrollment')
        .where('enrollment.userId = user.id')
        .andWhere('enrollment.courseId = :courseId')
        .andWhere('enrollment.status = :status')
        .getQuery();

      return `NOT EXISTS ${subQuery}`;
    })
    .setParameters({
      courseId,
      status: EnrollmentStatus.ACTIVE,
    });

  if (email?.trim()) {
    query.andWhere('user.email ILIKE :email', {
      email: `%${email.trim()}%`,
    });
  }

  return query
    .orderBy('user.createdAt', 'ASC')
    .take(7)
    .getMany();
}


  findOne(id: string) {
    return this.userRepository.findOne({
      where: { id: id },
    });
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  async remove(id: number) {
    const result = await this.userRepository.softDelete(id);
    if (result.affected === 0) {
      throw new Error(`User with ID ${id} not found`);
    }
  }

  async restore(id: number) {
    const result = await this.userRepository.restore(id);
    if (result.affected === 0) {
      throw new Error(`User with ID ${id} not found`);
    }
  }
}
