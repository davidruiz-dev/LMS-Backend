import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { Course } from "./entities/course.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Assignment } from "../assignments/entities/assignment.entity";
import { Submission } from "../submissions/entities/submission.entity";
import { Quiz, QuizType } from "../quizzes/entities/quiz.entity";
import { AttemptStatus, QuizAttempt } from "../quizzes/entities/quiz-attempt.entity";

@Injectable()
export class GradeService {
    constructor(
        @InjectRepository(Course)
        private readonly courseRepo: Repository<Course>,
        @InjectRepository(Assignment)
        private readonly assignmentRepo: Repository<Assignment>,
        @InjectRepository(Submission)
        private readonly submissionRepo: Repository<Submission>,
        @InjectRepository(Quiz)
        private readonly quizRepo: Repository<Quiz>,
        @InjectRepository(QuizAttempt)
        private readonly quizAttemptRepo: Repository<QuizAttempt>
    ) { }

    async calculateFinalGrade(
        courseId: string,
        studentId: string,
    ): Promise<{ percentage: number; grade: number } | null> {
        const course = await this.courseRepo.findOneByOrFail({ id: courseId });

        const assignmentPct = await this.calculateAssignmentsPct(courseId, studentId);
        const quizPct = await this.calculateQuizzesPct(courseId, studentId);

        const parts = [
            {
                pct: assignmentPct,
                weight: Number(course.assignmentsWeight),
            },
            {
                pct: quizPct,
                weight: Number(course.quizzesWeight),
            },
        ].filter((p) => p.pct !== null);

        if (parts.length === 0) return null;

        const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0);
        const weightedSum = parts.reduce((sum, p) => sum + p.pct! * p.weight, 0);

        const percentage = weightedSum / totalWeight;

        const grade = (percentage / 100) * Number(course.maxGrade);

        return {
            percentage: Number(percentage.toFixed(2)),
            grade: Number(grade.toFixed(2)),
        };
    }

    private async calculateAssignmentsPct(courseId: string, studentId: string): Promise<number | null> {
        const assignments = await this.assignmentRepo.find({ where: { courseId, isPublished: true } });
        let earned = 0, possible = 0;

        for (const a of assignments) {
            const sub = await this.submissionRepo.findOne({ where: { assignmentId: a.id, studentId }, order: { attemptNumber: 'DESC' } });
            if (sub?.grade == null) continue;
            earned += Number(sub.grade);
            possible += Number(a.maxPoints);
        }
        return possible === 0 ? null : (earned / possible) * 100;
    }

    private async calculateQuizzesPct(courseId: string, studentId: string): Promise<number | null> {
        const quizzes = await this.quizRepo.find({
            where: { courseId, published: true, type: QuizType.GRADED },
            relations: { questions: true }
        });

        let earned = 0, possible = 0;

        for (const q of quizzes) {
            const attempt = await this.quizAttemptRepo.findOne({
                where: { quizId: q.id, studentId, status: AttemptStatus.GRADED },
                order: { score: 'DESC' }
            });
            if (!attempt) continue;
            earned += Number(attempt.score);
            possible += q.questions.reduce((sum, quest) => sum + Number(quest.points), 0);
        }
        return possible === 0 ? null : (earned / possible) * 100;
    }
}