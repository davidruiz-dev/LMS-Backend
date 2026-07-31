import { Entity, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Quiz } from './quiz.entity';
import { User } from '../../users/entities/user.entity';
import { QuizAnswer } from './quiz-answer.entity';

export enum AttemptStatus {
    IN_PROGRESS = 'in_progress',
    SUBMITTED = 'submitted',
    GRADED = 'graded',
}

@Entity('quiz_attempts')
export class QuizAttempt {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'int' })
    attemptNumber: number;

    @Column({ type: 'enum', enum: AttemptStatus, default: AttemptStatus.IN_PROGRESS })
    status: AttemptStatus;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    score: number | null;

    @Column({ type: 'timestamp' })
    startedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    submittedAt: Date;

    @Column({ type: 'int', nullable: true })
    timeSpent: number; // segundos

    @ManyToOne(() => Quiz, quiz => quiz.attempts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'quizId' })
    quiz: Quiz;

    @Column()
    quizId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'studentId' })
    student: User;

    @Column()
    studentId: string;

    @OneToMany(() => QuizAnswer, answer => answer.attempt, { cascade: true })
    answers: QuizAnswer[];

    @CreateDateColumn()
    createdAt: Date
    @UpdateDateColumn()
    updateAt: Date
}