import { JwtModuleOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export const jwtConfigFactory = (
  configService: ConfigService,
): JwtModuleOptions => {
  const secret = configService.get<string>('JWT_SECRET');
  const expiresIn = configService.get<string>('JWT_EXPIRATION') || '24h';

  if (!secret) {
    throw new Error('JWT_SECRET must be defined in environment variables');
  }

  return {
    secret,
    signOptions: {
      expiresIn: expiresIn as any,
    },
  } as JwtModuleOptions;
};