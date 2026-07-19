import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { QuizQuestion } from './quiz-question.entity';

@Entity('question_options')
export class QuestionOption {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    text: string;

    @Column({ default: false })
    isCorrect: boolean;

    @Column({ type: 'int', default: 0 })
    position: number;

    @ManyToOne(() => QuizQuestion, question => question.options, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'questionId' })
    question: QuizQuestion;

    @Column()
    questionId: string;

    // timestamps
    @CreateDateColumn()
    createdAt: Date
    @UpdateDateColumn()
    updateAt: Date
}