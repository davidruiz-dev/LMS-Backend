import { Entity, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn } from 'typeorm';
import { QuizAttempt } from './quiz-attempt.entity';
import { QuizQuestion } from './quiz-question.entity';

@Entity('quiz_answers')
export class QuizAnswer {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    
    @Column({ type: 'text', nullable: true })
    answerText: string | null;

    @Column({ type: 'simple-array', nullable: true })
    selectedOptionIds: string[];

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    pointsAwarded: number | null;

    @Column({ default: false })
    isCorrect: boolean;

    @Column({ type: 'text', nullable: true })
    feedback: string;

    @ManyToOne(() => QuizAttempt, attempt => attempt.answers, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'attemptId' })
    attempt: QuizAttempt;

    @Column()
    attemptId: string;

    @ManyToOne(() => QuizQuestion)
    @JoinColumn({ name: 'questionId' })
    question: QuizQuestion;

    @Column()
    questionId: string;

    @CreateDateColumn()
    createdAt: Date
    @UpdateDateColumn()
    updateAt: Date
}