import { Assignment } from "src/modules/assignments/entities/assignment.entity";
import { Enrollment } from "src/modules/enrollments/entities/enrollment.entity";
import { Module } from "src/modules/modules/entities/module.entity";
import { User } from "src/modules/users/entities/user.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string
  @Column()
  name: string
  @Column({ type: 'text' })
  description: string
  @Column({ nullable: true })
  short_description: string;
  @Column()
  startDate: Date
  @Column()
  endDate: Date
  @Column({ nullable: true })
  imageUrl: string
  @Column({ nullable: true })
  imagePublicId: string
  @Column({ type: 'enum', enum: CourseStatus, default: CourseStatus.DRAFT })
  status: CourseStatus;
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 20,
  })
  maxGrade: number;

  @ManyToOne(() => User, (instructor) => instructor.courses, { nullable: true })
  @JoinColumn({ name: 'instructorId' })
  instructor: User
  @Column()
  instructorId: string;

  
  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[];

  @OneToMany(() => Module, (module) => module.course)
  modules: Module[];

  @OneToMany(() => Assignment, (assignment) => assignment.course)
  assignments: Assignment[];

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 60 })
  assignmentsWeight: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 40 })
  quizzesWeight: number;

  // timestamps
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updateAt: Date;
  @DeleteDateColumn()
  deletedAt: Date;
}
