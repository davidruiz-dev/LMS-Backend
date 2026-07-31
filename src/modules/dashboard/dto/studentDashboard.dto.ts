export class DashboardStatsDto {
  totalCourses: number;
  pendingAssignments: number;
  gradedAssignments: number;
  totalAssignments: number;
  completionRate: number;
}


export class CourseProgressDto {
  id: string;
  name: string;
  description: string;
  instructor: string;
  instructorAvatar?: string;
  progress: number;
  totalModules: number;
  completedModules: number;
  nextModule?: {
    id: string;
    title: string;
  };
  lastAccessed: Date;
  thumbnail?: string;
  category: string;
  rating: number;
  students: number;
  assignments: {
    total: number;
    completed: number;
    pending: number;
    graded: number;
  };
  upcomingDeadlines: UpcomingDeadlineDto[];
}

export class UpcomingDeadlineDto {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  dueDate: Date;
  type: 'assignment' | 'quiz' | 'exam' | 'project';
  priority: 'high' | 'medium' | 'low';
  progress?: number;
}

export class StudentDashboardResponse {
  stats: DashboardStatsDto;
  courses: any[];
  upcomingDeadlines: any[];
}