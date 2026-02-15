import { Course } from "src/modules/courses/entities/course.entity";
import { User } from "src/modules/users/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('announcements')
export class Announcement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ type: 'text'})
    content: string;

    @Column()
    authorId: string;
    
    @ManyToOne(() => User, user => user.announcements)
    @JoinColumn({ name: 'authorId' })
    author: User;

    @ManyToOne(()=>Course)
    @JoinColumn({name: 'courseId'})
    course: Course;
    @Column()
    courseId: string;

    @Column({ type: 'boolean', default: false})
    isPublished: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updateAt: Date;
}
