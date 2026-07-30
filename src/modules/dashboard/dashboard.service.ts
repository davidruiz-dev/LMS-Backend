import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { Submission, SubmissionStatus } from '../submissions/entities/submission.entity';
import { Module } from '../modules/entities/module.entity';
import { buildCourseData, calculateStats, getUpcomingDeadlines } from './utils/dashboard.utils';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(Enrollment)
        private readonly enrollmentRepository: Repository<Enrollment>,
        @InjectRepository(Assignment)
        private assignmentRepository: Repository<Assignment>,
        @InjectRepository(Submission)
        private submissionRepository: Repository<Submission>,
        @InjectRepository(Module)
        private moduleRepository: Repository<Module>,
    ) { }

    async getStudentDashboard(studentId: string): Promise<any> {
        const enrollments = await this.enrollmentRepository.find({
            where: {
                userId: studentId,
                status: EnrollmentStatus.ACTIVE
            },
            relations: ['course', 'course.instructor'],
        });

        if (!enrollments.length) {
            return {
                stats: {
                    totalCourses: 0,
                    totalAssignments: 0,
                    pendingAssignments: 0,
                    gradedAssignments: 0,
                    completionRate: 0,
                },
                courses: [],
                upcomingDeadlines: [],
            };
        }

        const courseIds = enrollments.map(e => e.courseId);

        // 2. Obtener todas las asignaciones de estos cursos
        const assignments = await this.assignmentRepository.find({
            where: {
                courseId: In(courseIds),
                isPublished: true,
            },
        });

        // 3. Obtener submissions del estudiante
        const submissions = await this.submissionRepository.find({
            where: {
                studentId,
                assignmentId: In(assignments.map(a => a.id)),
            },
        });

        // 4. Obtener módulos
        const modules = await this.moduleRepository.find({
            where: {
                courseId: In(courseIds),
                isPublished: true,
            },
        });

        // 5. Calcular estadísticas
        const stats = calculateStats(assignments, submissions);

        // 6. Construir datos de cursos
        const courses = await Promise.all(
            enrollments.map(enrollment =>
                buildCourseData(
                    enrollment,
                    assignments.filter(a => a.courseId === enrollment.courseId),
                    submissions.filter(s =>
                        assignments.some(a => a.id === s.assignmentId && a.courseId === enrollment.courseId)
                    ),
                    modules.filter(m => m.courseId === enrollment.courseId),
                )
            )
        );

        // 7. Obtener próximas fechas límite
        const upcomingDeadlines = getUpcomingDeadlines(assignments, submissions);

        return {
            stats,
            courses,
            upcomingDeadlines,
        };
    }



}
