import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Submission } from './submission.entity';

@Entity('submission_attachments')
export class SubmissionAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileName: string;

  @Column('text')
  storagePath: string;

  @Column({ type: 'int' })
  fileSize: number;

  @ManyToOne(() => Submission, (submission) => submission.attachmentFiles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submissionId' })
  submission: Submission;

  @Column()
  submissionId: string;

  @CreateDateColumn()
  createdAt: Date;
}