import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { v2 as cloudinary } from 'cloudinary';
import { User, UserRole } from '../users/entities/user.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Submission, SubmissionStatus } from '../submissions/entities/submission.entity';
import { Repository } from 'typeorm';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Course } from '../courses/entities/course.entity';
import { UserPayload } from 'src/auth/decorators/current-user.decorator';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class ProfileService {
    constructor(
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
        @InjectRepository(Submission) private readonly submissionRepo: Repository<Submission>,
        private readonly cloudinaryService: CloudinaryService,
    ) { }

    async getMyProfile(userId: string) {
        const user = await this.findUserOrFail(userId);
        return this.toProfileDto(user);
    }

    async getPublicProfile(userId: string, requester: UserPayload) {
        const user = await this.findUserOrFail(userId);
        await this.assertCanViewProfile(user, requester);
        return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.avatarUrl,
            biography: user.biography,
            role: user.role,
        };
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        const user = await this.findUserOrFail(userId);
        Object.assign(user, dto);
        await this.userRepo.save(user);
        return this.toProfileDto(user);
    }

    async changePassword(userId: string, dto: ChangePasswordDto) {
        const user = await this.findUserOrFail(userId);
        await this.assertCurrentPasswordMatches(user, dto.currentPassword);
        this.assertNewPasswordIsDifferent(dto);
        user.password = await bcrypt.hash(dto.newPassword, 10);
        await this.userRepo.save(user);
    }

    async updateAvatar(userId: string, file: Express.Multer.File) {
        this.assertValidImage(file);
        const user = await this.findUserOrFail(userId);

        const result = await this.cloudinaryService.uploadImage(file, 'avatars');

        if (user.avatarPublicId) {
            await this.cloudinaryService.deleteImage(user.avatarPublicId).catch(() => null);
        }

        user.avatarUrl = result.secure_url;
        user.avatarPublicId = result.public_id;
        await this.userRepo.save(user);

        return { avatarUrl: user.avatarUrl };
    }

    private assertValidImage(file: Express.Multer.File) {
        if (!file) throw new BadRequestException('Archivo requerido');
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
            throw new BadRequestException('Formato de imagen no soportado');
        }
        if (file.size > 3 * 1024 * 1024) {
            throw new BadRequestException('La imagen no debe superar 3MB');
        }
    }

    async getStats(userId: string) {
        const user = await this.findUserOrFail(userId);

        if (user.role === UserRole.STUDENT) {
            const [enrollmentCount, submissionStats] = await Promise.all([
                this.enrollmentRepo.count({ where: { userId: userId } }),
                this.submissionRepo
                    .createQueryBuilder('s')
                    .where('s."studentId" = :userId', { userId })
                    .select('COUNT(*)', 'total')
                    .addSelect('COUNT(*) FILTER (WHERE s.status = :graded)', 'graded')
                    .addSelect('AVG(s.grade) FILTER (WHERE s.grade IS NOT NULL)', 'avgGrade')
                    .setParameter('graded', SubmissionStatus.GRADED)
                    .getRawOne(),
            ]);

            return {
                coursesEnrolled: enrollmentCount,
                assignmentsSubmitted: Number(submissionStats.total),
                assignmentsGraded: Number(submissionStats.graded),
                averageGrade: submissionStats.avgGrade ? Number(Number(submissionStats.avgGrade).toFixed(2)) : null,
            };
        }

        const coursesCreated = await this.userRepo.manager.getRepository(Course).count({
            where: { instructorId: userId },
        });
        return { coursesCreated };
    }

    private async findUserOrFail(userId: string): Promise<User> {
        const user = await this.userRepo.findOneBy({ id: userId });
        if (!user) throw new NotFoundException('Usuario no encontrado');
        return user;
    }

    private toProfileDto(user: User) {
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.avatarUrl,
            biography: user.biography,
            role: user.role,
            createdAt: user.createdAt,
        };
    }

    private async assertCanViewProfile(target: User, requester: UserPayload) {
        if (requester.id === target.id || requester.role === UserRole.ADMIN) return;

        const shareCourse = await this.enrollmentRepo
            .createQueryBuilder('e')
            .innerJoin('e.course', 'c')
            .where('e."userId" IN (:...ids)', { ids: [target.id, requester.id] })
            .andWhere(
                '(c."instructorId" = :requesterId OR EXISTS (SELECT 1 FROM enrollments e2 WHERE e2."courseId" = c.id AND e2."userId" = :requesterId))',
                { requesterId: requester.id },
            )
            .getExists();

        if (!shareCourse) throw new ForbiddenException('No puedes ver este perfil');
    }

    private async assertCurrentPasswordMatches(user: User, password: string) {
        const matches = await bcrypt.compare(password, user.password);
        if (!matches) throw new UnauthorizedException('Contraseña actual incorrecta');
    }

    private assertNewPasswordIsDifferent(dto: ChangePasswordDto) {
        if (dto.currentPassword === dto.newPassword) {
            throw new BadRequestException('La nueva contraseña debe ser distinta a la actual');
        }
    }
}