import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { StudentDashboardResponse } from './dto/studentDashboard.dto';
import { CurrentUser, UserPayload } from 'src/auth/decorators/current-user.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('student')
  async getStudentDashboard(@CurrentUser() user: UserPayload): Promise<StudentDashboardResponse> {
    return this.dashboardService.getStudentDashboard(user.id);
  }

  @Get('student/stats')
  async getStudentStats(@CurrentUser() user: UserPayload) {
    const dashboard = await this.dashboardService.getStudentDashboard(user.id);
    return dashboard.stats;
  }

  @Get('instructor')
  async getInstructorDashboard(@CurrentUser() user: UserPayload) {
    return this.dashboardService.getInstructorDashboard(user.id)
  }
}
