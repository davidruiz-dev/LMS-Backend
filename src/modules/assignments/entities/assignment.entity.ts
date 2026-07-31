import { Course } from "src/modules/courses/entities/course.entity";
import { Submission } from "src/modules/submissions/entities/submission.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export enum AssignmentType {
  ASSIGNMENT = 'assignment',     // ← Tarea tradicional (subir archivo/texto)
  QUIZ = 'quiz',                 // ← Examen/Cuestionario con preguntas
  DISCUSSION = 'discussion',     // ← Foro de discusión evaluado
  EXTERNAL_TOOL = 'external_tool', // ← LTI/Herramienta externa
  NOT_GRADED = 'not_graded',     // ← Actividad no calificada
  ATTENDANCE = 'attendance'      // ← Asistencia
}

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ nullable: true })
  instructions: string;

  @Column({ type: 'enum', enum: AssignmentType, default: AssignmentType.ASSIGNMENT })
  type: AssignmentType;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  maxPoints: number;

  @Column({ default: 2 })
  maxAttempts: number;

  @Column({ default: true })
  allowLateSubmissions: boolean;

  @Column()
  dueDate: Date;

  @Column({ nullable: true })
  availableFrom: Date;

  @Column({ nullable: true })
  availableUntil: Date;

  @Column({ default: true })
  isPublished: boolean;

  @ManyToOne(() => Course, course => course.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  courseId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updateAt: Date;

  @OneToMany(()=>Submission, submission => submission.assignment)
  submissions: Submission[]

  isAvailable(date: Date = new Date()): boolean {
    if (!this.isPublished) return false;

    if (this.availableFrom && date < this.availableFrom) {
      return false;
    }

    if (this.availableUntil && date > this.availableUntil) {
      return false;
    }

    return true;
  }
}
