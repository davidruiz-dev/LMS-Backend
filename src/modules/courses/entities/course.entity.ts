import { Enrollment } from "src/modules/enrollments/entities/enrollment.entity";
import { GradeLevel } from "src/modules/grade-level/entities/grade-level.entity";
import { User } from "src/modules/users/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

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
    @Column({default: false})
    isActive: boolean
    @ManyToOne(()=> User, (instructor) => instructor.courses, {nullable: true})
    @JoinColumn({ name: 'instructorId' })
    instructor: User
    @ManyToOne(()=> GradeLevel, (gl) => gl.courses)
    @JoinColumn({ name: 'gradeLevelId' })
    gradeLevel: GradeLevel
    @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
    enrollments: Enrollment[];
    // timestamps
    @CreateDateColumn()
    createdAt: Date
    @UpdateDateColumn()
    updateAt: Date
}
