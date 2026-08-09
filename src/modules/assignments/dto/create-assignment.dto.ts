export class CreateAssignmentDto {
    name: string;
    description: string;
    maxPoints: number;
    dueDate: Date;
    maxAttempts: number
    allowLateSubmissions: boolean;
    availableFrom: Date;
    availableUntil: Date;
    isPublished: boolean;
}
