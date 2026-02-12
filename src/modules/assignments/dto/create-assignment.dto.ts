import { AssignmentType } from "src/modules/assignments/entities/assignment.entity";

export class CreateAssignmentDto {
    name: string;
    description: string;
    type: AssignmentType;
    maxPoints: number;
    dueDate: Date;
    maxAttempts: number
    allowLateSubmissions: boolean;
    availableFrom: Date;
    availableUntil: Date;
    isPublished: boolean;
}
