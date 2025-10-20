import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Exclude } from 'class-transformer';
import { Enrollment } from "src/modules/enrollments/entities/enrollment.entity";
import { Course } from "src/modules/courses/entities/course.entity";
import { Post } from "src/modules/posts/entities/post.entity";
import { Comment } from "src/modules/comments/entities/comment.entity";

export enum UserRole {
    ADMIN = 'admin',
    INSTRUCTOR = 'instructor',
    STUDENT = 'student'
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column({ default: true })
    isActive: boolean;

    @Column()
    email: string

    @Column({nullable: true})
    image: string

    @Exclude()
    @Column()
    password: string

    // @Column({nullable: true})
    // dni: string

    @Column({type: 'enum', enum: UserRole, default: UserRole.STUDENT})
    role: UserRole;

    @OneToMany(() => Enrollment, (enrollment) => enrollment.user)
    enrollments: Enrollment[];
    @OneToMany(() => Course, (c) => c.instructor)
    courses: Course[];
    @OneToMany(() => Post, (post) => post.author)
    posts: Post[];
    @OneToMany(() => Comment, (comment) => comment.author)
    comments: Comment[];

    @CreateDateColumn()
    createdAt: Date
    @UpdateDateColumn()
    updateAt: Date
    @DeleteDateColumn()
    deletedAt: Date;
}
