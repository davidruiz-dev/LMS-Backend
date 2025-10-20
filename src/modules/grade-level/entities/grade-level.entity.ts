import { Course } from "src/modules/courses/entities/course.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export enum Level {
    PRIMARIA = "primaria",
    SECUNDARIA = "secundaria",
}

@Entity('grade_levels')
export class GradeLevel {
    @PrimaryGeneratedColumn('uuid')
    id: string
    @Column()
    name: string
    @Column({type: 'enum', enum: Level, default: Level.PRIMARIA,})
    level: Level
    @Column({nullable: true})
    description: string
    @OneToMany(()=> Course, (course)=>course.gradeLevel)
    courses: Course[]
    @CreateDateColumn()
    createdAt: Date
    @UpdateDateColumn()
    updatedAt: Date
    @DeleteDateColumn()
    deletedAt: Date;
}
