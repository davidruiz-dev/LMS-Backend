import { Entity, Column, ManyToOne, OneToMany, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Quiz } from './quiz.entity';
import { QuestionOption } from './question-option.entity';

export enum QuestionType {
    MULTIPLE_CHOICE = 'multiple_choice',
    TRUE_FALSE = 'true_false',
    SHORT_ANSWER = 'short_answer',
    ESSAY = 'essay',
    FILL_IN_BLANK = 'fill_in_blank',
}

@Entity('quiz_questions')
export class QuizQuestion {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    questionText: string;

    @Column({ type: 'enum', enum: QuestionType })
    type: QuestionType;

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    points: number;

    @Column({ type: 'int', default: 0 })
    position: number;

    @Column({ type: 'text', nullable: true })
    explanation: string;

    @ManyToOne(() => Quiz, quiz => quiz.questions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'quizId' })
    quiz: Quiz;

    @Column()
    quizId: string;

    @OneToMany(() => QuestionOption, option => option.question, { cascade: true })
    options: QuestionOption[];

    @CreateDateColumn()
    createdAt: Date
    @UpdateDateColumn()
    updateAt: Date
}