import { Enrollment } from "src/modules/enrollments/entities/enrollment.entity";
import { GradeLevel } from "src/modules/grade-level/entities/grade-level.entity";
import { Module } from "src/modules/modules/entities/module.entity";
import { User } from "src/modules/users/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

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
    @Column({type: 'text'})
    description: string
    @Column({nullable: true})
    short_description: string;
    @Column()
    startDate: Date
    @Column()
    endDate: Date
    @Column({nullable: true})
    imageUrl: string
    @Column({nullable: true})
    imagePublicId: string

    @Column({ type: 'enum', enum: CourseStatus, default: CourseStatus.DRAFT })
    status: CourseStatus;

    @ManyToOne(()=> User, (instructor) => instructor.courses, {nullable: true})
    @JoinColumn({ name: 'instructorId' })
    instructor: User
    @Column()
    instructorId: string;
    
    @ManyToOne(()=> GradeLevel, (gl) => gl.courses)
    @JoinColumn({ name: 'gradeLevelId' })
    gradeLevel: GradeLevel
    @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
    enrollments: Enrollment[];

    @OneToMany(() => Module, (module) => module.course)
    modules: Module[];
    
    // timestamps
    @CreateDateColumn()
    createdAt: Date
    @UpdateDateColumn()
    updateAt: Date
}
