import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

interface JwtPayload {
  sub: number;
  email: string;
  role: number;
  verified: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
  const user = await this.userRepository.findOne({
    where: { id: payload.sub },
    relations: ['role'],
  });

  if (!user) {
    throw new UnauthorizedException('Usuario no encontrado');
  }

  if (!user.emailVerified) {
    throw new UnauthorizedException(
      'Email no verificado. Por favor verifica tu email.',
    );
  }

  const result = {
    userId: payload.sub,
    email: payload.email,
    role: user.role?.name || 'user',
    roleId: payload.role,
    verified: payload.verified,
  };

  return result;
}
}