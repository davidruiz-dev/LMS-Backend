import { UserRole } from "src/modules/users/entities/user.entity";

export interface JwtPayload {
  sub: string; // o number, depende cómo identifiques usuarios
  email: string;
  role: UserRole;
}
