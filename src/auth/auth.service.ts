import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/modules/users/users.service';
import { UserPayload } from './decorators/current-user.decorator';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService
    ) { }

    async validateUser(email: string, password: string): Promise<UserPayload | null> {
        const user = await this.usersService.findOneByEmail(email);
        if (!user) return null;
    
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        const { password: _, ...result } = user;
        return result;
    }

    async login(user: UserPayload): Promise<{ access_token: string }> {
        const payload = { sub: user.id, role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }

}
