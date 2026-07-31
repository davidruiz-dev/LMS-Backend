import { Module } from "src/modules/modules/entities/module.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export enum ModuleItemType {
    ASSIGNMENT = 'assignment',
    DISCUSSION = 'discussion',
    FILE = 'file',
    PAGE = 'page',
    QUIZ = 'quiz',
    EXTERNAL_URL = 'external_url',
}

@Entity('module_items')
export class ModuleItem {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ length: 200 })
    title: string;

    @Column({ type: 'enum', enum: ModuleItemType })
    type: ModuleItemType;

    @Column({ nullable: true })
    contentId: string;

    @Column({ type: 'text', nullable: true })
    content: string;

    @Column({ type: 'varchar', length: 1000, nullable: true })
    externalUrl: string;

    @Column({ type: 'int', default: 0 })
    position: number;

    @Column({ default: false })
    published: boolean;

    @ManyToOne(() => Module, module => module.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'moduleId' })
    module: Module;

    @Column()
    moduleId: string;

    @CreateDateColumn()
    createdAt: Date
    @UpdateDateColumn()
    updateAt: Date
}