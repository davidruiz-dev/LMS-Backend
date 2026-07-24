import { Assignment } from "src/modules/assignments/entities/assignment.entity";
import { User } from "src/modules/users/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { SubmissionAttachment } from "./submission-attachment.entity";

export enum SubmissionStatus {
    DRAFT = 'draft',
    SUBMITTED = 'submitted',
    GRADED = 'graded',
    RETURNED = 'returned',
    RESUBMITTED = 'resubmitted',
}

@Entity('submissions')
export class Submission {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text', { nullable: true })
    content: string;

    // @Column({ type: 'simple-array', nullable: true })
    // attachments: string[]; // URLs de archivos

    @Column({
        type: 'enum',
        enum: SubmissionStatus,
        default: SubmissionStatus.DRAFT,
    })
    status: SubmissionStatus;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'studentId' })
    student: User
    @Column()
    studentId: string;

    @ManyToOne(() => Assignment, (assignment) => assignment.submissions, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'assignmentId' })
    assignment: Assignment;

    @Column()
    assignmentId: string;

    @Column({ type: 'timestamptz', nullable: true })
    submittedAt: Date;

    @Column({ default: false })
    isLate: boolean;

    @Column({ type: 'int', default: 1 })
    attemptNumber: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    grade: number;

    @Column('text', { nullable: true })
    feedback: string;

    @OneToMany(() => SubmissionAttachment, (attachment) => attachment.submission, {
        cascade: true,
        eager: false,
    })
    attachmentFiles: SubmissionAttachment[];

    @Column({ type: 'timestamptz', nullable: true })
    gradedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updateAt: Date;

    // Métodos de negocio
    canResubmit(assignment: Assignment): boolean {
        if (this.status === SubmissionStatus.GRADED && !assignment.allowLateSubmissions) {
            return false;
        }

        if (assignment.maxAttempts === -1) return true;

        return this.attemptNumber < assignment.maxAttempts;
    }

    calculateFinalGrade(assignment: Assignment): number {
        if (!this.grade) return 0;

        let finalGrade = parseFloat(this.grade.toString());

        // Aplicar penalización por entrega tardía
        // if (this.isLate && assignment.lateSubmissionPenalty) {
        //   const penalty = (finalGrade * assignment.lateSubmissionPenalty) / 100;
        //   finalGrade = Math.max(0, finalGrade - penalty);
        // }

        return Math.round(finalGrade * 100) / 100;
    }
}
