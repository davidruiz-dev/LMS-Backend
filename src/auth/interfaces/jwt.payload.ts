import { UserRole } from "src/modules/users/entities/user.entity";

export interface JwtPayload {
  sub: string;
  role: UserRole;
}
