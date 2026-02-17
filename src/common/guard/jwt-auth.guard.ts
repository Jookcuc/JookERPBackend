import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // ✅ LOG: Ver el header
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    this.logger.debug(`📋 Authorization Header: ${authHeader ? authHeader.substring(0, 30) + '...' : 'No existe'}`);

    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // ✅ LOGS DETALLADOS
    this.logger.debug(`🔍 handleRequest llamado`);
    this.logger.debug(`❌ Error: ${err ? err.message : 'No'}`);
    this.logger.debug(`👤 User: ${user ? 'Existe' : 'No existe'}`);
    this.logger.debug(`ℹ️ Info: ${info ? JSON.stringify(info) : 'No'}`);

    if (err || !user) {
      this.logger.error(`❌ Rechazando request - Error: ${err?.message || 'Usuario no existe'}, Info: ${info?.message || 'N/A'}`);
      throw (
        err ||
        new UnauthorizedException(
          'Token inválido o expirado. Por favor inicia sesión nuevamente.',
        )
      );
    }

    this.logger.debug(`✅ Request aprobado para usuario: ${user.email}`);
    return user;
  }
}