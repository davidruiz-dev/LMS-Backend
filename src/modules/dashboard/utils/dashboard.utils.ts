import { Assignment } from "src/modules/assignments/entities/assignment.entity";
import { Course } from "src/modules/courses/entities/course.entity";
import { Enrollment } from "src/modules/enrollments/entities/enrollment.entity";
import { Module } from "src/modules/modules/entities/module.entity";
import { Submission, SubmissionStatus } from "src/modules/submissions/entities/submission.entity";

function getLatestSubmissionsPerAssignment(submissions: Submission[]): Map<string, Submission> {
    const map = new Map<string, Submission>();

    // Orden de prioridad de estados
    const statusPriority = {
        [SubmissionStatus.GRADED]: 4,
        [SubmissionStatus.SUBMITTED]: 3,
        [SubmissionStatus.RESUBMITTED]: 2,
        [SubmissionStatus.RETURNED]: 1,
        [SubmissionStatus.DRAFT]: 0,
    };

    submissions.forEach(sub => {
        const existing = map.get(sub.assignmentId);

        if (!existing) {
            map.set(sub.assignmentId, sub);
            return;
        }

        // Comparar prioridad de estado
        const currentPriority = statusPriority[sub.status] || 0;
        const existingPriority = statusPriority[existing.status] || 0;

        if (currentPriority > existingPriority) {
            map.set(sub.assignmentId, sub);
        } else if (currentPriority === existingPriority) {
            // Si mismo estado, usar el más reciente
            if (new Date(sub.submittedAt || sub.createdAt) > new Date(existing.submittedAt || existing.createdAt)) {
                map.set(sub.assignmentId, sub);
            }
        }
    });

    return map;
}

export function calculateStats(assignments: Assignment[], submissions: Submission[]) {
    // Crear un mapa de assignmentId -> mejor submission (más reciente o con mejor estado)
    const submissionMap = getLatestSubmissionsPerAssignment(submissions);

    const total = assignments.length;

    // Tareas que tienen AL MENOS UNA submission en estado válido
    const submitted = assignments.filter(a => {
        const sub = submissionMap.get(a.id);
        return sub && (
            sub.status === SubmissionStatus.SUBMITTED ||
            sub.status === SubmissionStatus.GRADED ||
            sub.status === SubmissionStatus.RESUBMITTED
        );
    }).length;

    // Tareas que tienen AL MENOS UNA submission calificada
    const graded = assignments.filter(a => {
        const sub = submissionMap.get(a.id);
        return sub && sub.status === SubmissionStatus.GRADED;
    }).length;

    // Tareas pendientes (sin submission o solo en draft)
    const pending = assignments.filter(a => {
        const sub = submissionMap.get(a.id);
        return !sub || sub.status === SubmissionStatus.DRAFT;
    }).length;

    const overdueAssignments = assignments.filter(a => {
        const sub = submissionMap.get(a.id);

        const hasNoValidSubmission =
            !sub ||
            sub.status === SubmissionStatus.DRAFT ||
            sub.status === SubmissionStatus.RETURNED;

        const isExpired = new Date(a.dueDate) < new Date();

        return hasNoValidSubmission && isExpired;
    }).length;

    return {
        totalAssignments: total,
        submittedAssignments: submitted,
        overdueAssignments: overdueAssignments,
        gradedAssignments: graded,
        pendingAssignments: pending,
        completionRate: total > 0 ? Math.round((submitted / total) * 100) : 0,
    };
}

export function buildCourseData(
    assignments: Assignment[],
    submissions: Submission[],
    modules: Module[],
    course: Course
) {
    const submissionMap = getLatestSubmissionsPerAssignment(submissions);

    const total = assignments.length;

    // Tareas enviadas (al menos un intento válido)
    const submitted = assignments.filter(a => {
        const sub = submissionMap.get(a.id);
        return sub && (
            sub.status === SubmissionStatus.SUBMITTED ||
            sub.status === SubmissionStatus.GRADED ||
            sub.status === SubmissionStatus.RESUBMITTED
        );
    }).length;

    // Tareas calificadas
    const graded = assignments.filter(a => {
        const sub = submissionMap.get(a.id);
        return sub && sub.status === SubmissionStatus.GRADED;
    }).length;

    // Tareas pendientes
    const pending = assignments.filter(a => {
        const sub = submissionMap.get(a.id);
        return !sub || sub.status === SubmissionStatus.DRAFT;
    }).length;

    // Encontrar próxima tarea pendiente (sin considerar intentos fallidos)
    const now = new Date();
    const nextAssignment = assignments
        .filter(a => {
            const sub = submissionMap.get(a.id);
            // Pendiente = sin submission o solo en draft
            const isPending = !sub || sub.status === SubmissionStatus.DRAFT;
            const isFuture = new Date(a.dueDate) >= now;
            return isPending && isFuture;
        })
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    // Obtener mejor calificación por tarea (para mostrar promedio)
    const gradedSubmissions = assignments
        .map(a => {
            const sub = submissionMap.get(a.id);
            if (sub && sub.status === SubmissionStatus.GRADED && sub.grade) {
                return Number(sub.grade);
            }
            return null;
        })
        .filter((grade): grade is number => grade !== null);

    const averageGrade = gradedSubmissions.length > 0
        ? gradedSubmissions.reduce((sum, g) => sum + g, 0) / gradedSubmissions.length
        : 0;

    // Intentos totales (para mostrar estadística)
    const totalAttempts = submissions.length;

    return {
        id: course.id,
        name: course.name,
        description: course.short_description || course.description,
        instructor: course.instructor ? {
            id: course.instructor.id,
            avatar: course.instructor.avatarUrl,
            firstName: course.instructor.firstName,
            lastName: course.instructor.lastName,
            fullName: `${course.instructor.firstName} ${course.instructor.lastName}`,
        } : null,
        progress: total > 0 ? Math.round((submitted / total) * 100) : 0,
        totalModules: modules.length,
        totalAssignments: total,
        completedAssignments: submitted,
        gradedAssignments: graded,
        pendingAssignments: pending,
        totalAttempts, // Información adicional: cuántos intentos en total
        nextAssignment: nextAssignment ? {
            id: nextAssignment.id,
            title: nextAssignment.name,
            dueDate: nextAssignment.dueDate,
        } : null,
        imageUrl: course.imageUrl,
        averageGrade: Math.round(averageGrade * 100) / 100,
    };
}

export function getUpcomingDeadlines(assignments: Assignment[], submissions: Submission[]) {
    const submissionMap = getLatestSubmissionsPerAssignment(submissions);
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return assignments
        .filter(a => {
            const sub = submissionMap.get(a.id);
            // Solo tareas pendientes (sin entrega válida)
            const isPending = !sub ||
                sub.status === SubmissionStatus.DRAFT ||
                sub.status === SubmissionStatus.RETURNED;

            const isSoon = new Date(a.dueDate) >= now &&
                new Date(a.dueDate) <= sevenDaysFromNow;

            return isPending && isSoon;
        })
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 5)
        .map(a => {
            const sub = submissionMap.get(a.id);
            const attempts = submissions.filter(s => s.assignmentId === a.id).length;

            return {
                id: a.id,
                title: a.name,
                courseId: a.courseId,
                dueDate: a.dueDate,
                priority: this.getPriority(a.dueDate),
                attemptsUsed: attempts, // Información útil: intentos usados
                maxAttempts: a.maxAttempts,
            };
        });
}

export function getPriority(dueDate: Date): 'high' | 'medium' | 'low' {
    const diffDays = Math.ceil(
        (new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays <= 2) return 'high';
    if (diffDays <= 5) return 'medium';
    return 'low';
}