import { Course } from 'src/modules/courses/entities/course.entity';
import { ModuleItem } from 'src/modules/modules/entities/module-item.entity';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('modules')
export class Module {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ default: false })
  isPublished: boolean;

  @ManyToOne(() => Course, (course) => course.modules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  courseId: string;

  @OneToMany(() => ModuleItem, (item) => item.module)
  items: ModuleItem[];

  // timestamps
  @CreateDateColumn()
  createdAt: Date
  @UpdateDateColumn()
  updateAt: Date
}
