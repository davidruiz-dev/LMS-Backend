import { Course } from "src/modules/courses/entities/course.entity";
import { User } from "src/modules/users/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('enrollments')
export class Enrollment {
    @PrimaryGeneratedColumn('uuid')
    id: string
    @ManyToOne(() => User, (student) => student.enrollments)
    @JoinColumn({name: 'userId'})
    user: User

    @ManyToOne(() => Course, (course) => course.enrollments)
    @JoinColumn({name: 'courseId'})
    course: Course;

    @Column({ default: 'active' }) // Puede ser 'active', 'completed', 'dropped'
    status: string;

    

    @CreateDateColumn()
    createdAt: Date
    @UpdateDateColumn()
    updateAt: Date
}
