import { Course } from 'src/modules/courses/entities/course.entity';
import { Entity, Column, ManyToOne, OneToMany, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { QuizQuestion } from './quiz-question.entity';
import { QuizAttempt } from './quiz-attempt.entity';

export enum QuizType {
    PRACTICE = 'practice',
    GRADED = 'graded',
    SURVEY = 'survey',
}

@Entity()
export class Quiz {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 200 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'enum', enum: QuizType, default: QuizType.GRADED })
    type: QuizType;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    points: number;

    @Column({ type: 'int', nullable: true })
    timeLimit: number; // minutos

    @Column({ type: 'int', default: 1 })
    allowedAttempts: number; // -1 = ilimitado

    @Column({ default: false })
    shuffleQuestions: boolean;

    @Column({ default: false })
    shuffleAnswers: boolean;

    @Column({ default: false })
    showCorrectAnswers: boolean;

    @Column({ type: 'timestamp', nullable: true })
    dueDate: Date;

    @Column({ type: 'timestamp', nullable: true })
    availableFrom: Date;

    @Column({ type: 'timestamp', nullable: true })
    availableUntil: Date;

    @Column({ default: true })
    published: boolean;

    @ManyToOne(() => Course, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'courseId' })
    course: Course;

    @Column()
    courseId: string;

    @OneToMany(() => QuizQuestion, question => question.quiz, { cascade: true })
    questions: QuizQuestion[];

    @OneToMany(() => QuizAttempt, attempt => attempt.quiz)
    attempts: QuizAttempt[];

    @CreateDateColumn()
    createdAt: Date
    @UpdateDateColumn()
    updateAt: Date
}
