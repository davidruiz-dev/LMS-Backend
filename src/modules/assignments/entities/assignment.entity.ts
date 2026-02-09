import { Course } from "src/modules/courses/entities/course.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

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

    @Column({ type: 'enum', enum: AssignmentType, default: AssignmentType.ASSIGNMENT })
    type: AssignmentType;

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    points: number;

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
}
