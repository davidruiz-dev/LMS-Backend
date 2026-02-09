import { AssignmentType } from "src/modules/assignments/entities/assignment.entity";

export class CreateAssignmentDto {
    name: string;
    description: string;
    type: AssignmentType;
    points: number;
    dueDate: Date;
    availableFrom: Date;
    availableUntil: Date;
    isPublished: boolean;
}
