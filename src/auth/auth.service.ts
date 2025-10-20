import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService
    ) { }

    async signIn(loginDto: LoginDto): Promise<{ access_token: string }> {
        const user = await this.usersService.findOneByEmail(loginDto.email);
        if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const payload = { sub: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role };

        const access_token = await this.jwtService.signAsync(payload);
        return { access_token };
    }

    async validateUser(email: string, password: string) {
        const user = await this.usersService.findOneByEmail(email);
        if (!user) return null;

        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid) return null;

        // Retornamos usuario sin password
        const {...result } = user;
        return result;
    }

    async login(user: any) {
        const payload = { sub: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role};
        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    async getCurrentUser() {

    }
}
