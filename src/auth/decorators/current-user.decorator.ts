import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from 'src/modules/users/entities/user.entity';

export interface UserPayload {
  id: string;
  email: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);