import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from './entities/user.entity';
import { UserKey } from './entities/user-key.entity';
import { EmailVerificationCode } from './entities/email-verification.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserKey)
    private userKeyRepository: Repository<UserKey>,
    @InjectRepository(EmailVerificationCode)
    private verificationCodeRepository: Repository<EmailVerificationCode>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { firstName, lastName, email, password, confirmPassword, useKey } = registerDto;

    if (password !== confirmPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Buscar la llave y validarla
    const userKey = await this.userKeyRepository.findOne({
      where: { keyValue: useKey, used: false },
    });

    if (!userKey) {
      throw new BadRequestException('Llave de uso inválida o ya utilizada');
    }

    if (!userKey.companyId) {
      throw new BadRequestException('La llave no tiene empresa asociada');
    }

    if (userKey.expiresAt && new Date() > userKey.expiresAt) {
      throw new BadRequestException('La llave de uso ha expirado');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear el usuario heredando companyId de la llave
    const user = this.userRepository.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      emailVerified: false,
      idRole: 1,
      companyId: userKey.companyId,  // ← heredado de la llave
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`Usuario registrado: ${savedUser.email} (ID: ${savedUser.id})`);

    // Marcar la llave como usada y asociarla al usuario
    userKey.used = true;
    userKey.userId = savedUser.id;
    await this.userKeyRepository.save(userKey);

    // Generar código de verificación
    const verificationCode = await this.generateVerificationCode(savedUser.id);

    // Enviar email de verificación
    try {
      await this.emailService.sendVerificationEmail(
        savedUser.email,
        savedUser.firstName,
        verificationCode.code,
      );
    } catch (error) {
      this.logger.error('Error enviando email de verificación:', error);
      // Revertir si no se puede enviar el email
      await this.userRepository.delete(savedUser.id);
      await this.userKeyRepository.update(userKey.idKey, { used: false });
      throw new BadRequestException(
        'No se pudo enviar el email de verificación. Por favor, intenta nuevamente.',
      );
    }

    return {
      success: true,
      message: 'Usuario registrado exitosamente. Por favor verifica tu email para continuar.',
      data: {
        email: savedUser.email,
        userId: savedUser.id,
        companyId: savedUser.companyId,
        codeExpiresInSeconds: 90,
      },
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { code, email } = verifyEmailDto;

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (user.emailVerified) {
      throw new BadRequestException('El email ya ha sido verificado');
    }

    const verificationCode = await this.verificationCodeRepository.findOne({
      where: {
        userId: user.id,
        code,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!verificationCode) {
      throw new BadRequestException(
        'Código inválido o expirado. Por favor solicita un nuevo código.',
      );
    }

    verificationCode.used = true;
    await this.verificationCodeRepository.save(verificationCode);

    user.emailVerified = true;
    user.updatedAt = new Date();
    await this.userRepository.save(user);

    this.logger.log(`Email verificado: ${user.email}`);

    const token = await this.generateToken(user);
    const apiKey = await this.generateApiKey(user.id);

    this.emailService.sendWelcomeEmail(user.email, user.firstName).catch((err) => {
      this.logger.error('Error enviando email de bienvenida:', err);
    });

    return {
      success: true,
      message: 'Email verificado exitosamente. ¡Bienvenido a Jook ERP!',
      data: {
        token,
        apiKey: apiKey.keyValue,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          companyId: user.companyId,
          emailVerified: user.emailVerified,
        },
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Por favor verifica tu email antes de iniciar sesión. Revisa tu bandeja de entrada.',
      );
    }

    this.logger.log(`Login exitoso: ${user.email}`);

    const token = await this.generateToken(user);

    const apiKey = await this.userKeyRepository.findOne({
      where: { userId: user.id, used: true },
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        token,
        apiKey: apiKey?.keyValue,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role?.name || 'user',
          companyId: user.companyId,
          emailVerified: user.emailVerified,
        },
      },
    };
  }

  async resendVerificationCode(email: string) {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (user.emailVerified) {
      throw new BadRequestException('El email ya ha sido verificado');
    }

    await this.verificationCodeRepository.update(
      { userId: user.id, used: false },
      { used: true },
    );

    const verificationCode = await this.generateVerificationCode(user.id);

    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        user.firstName,
        verificationCode.code,
      );

      this.logger.log(`Código reenviado a: ${user.email}`);

      return {
        success: true,
        message: 'Código de verificación reenviado exitosamente',
        data: {
          email: user.email,
          codeExpiresInSeconds: 90,
        },
      };
    } catch (error) {
      this.logger.error('Error reenviando código:', error);
      throw new BadRequestException(
        'No se pudo enviar el código de verificación. Por favor, intenta nuevamente.',
      );
    }
  }

  async validateUser(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Email no verificado');
    }

    return user;
  }

  async cleanExpiredCodes(): Promise<number> {
    const result = await this.verificationCodeRepository.delete({
      expiresAt: MoreThan(new Date()),
    });

    const deletedCount = result.affected || 0;
    this.logger.log(`Códigos expirados eliminados: ${deletedCount}`);
    return deletedCount;
  }

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    const apiKey = await this.userKeyRepository.findOne({
      where: { userId: user.id, used: true },
      order: { createdAt: 'DESC' },
    });

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role?.name || 'user',
      companyId: user.companyId,
      emailVerified: user.emailVerified,
      apiKey: apiKey?.keyValue,
      createdAt: user.createdAt,
    };
  }

  // ─── MÉTODOS PRIVADOS ────────────────────────────────────────

  private async generateVerificationCode(userId: number): Promise<EmailVerificationCode> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const expirySeconds = this.configService.get<number>('VERIFICATION_CODE_EXPIRY_SECONDS', 90);
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expirySeconds);

    const verificationCode = this.verificationCodeRepository.create({
      userId,
      code,
      expiresAt,
    });

    return this.verificationCodeRepository.save(verificationCode);
  }

  private async generateToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.idRole,
      companyId: user.companyId,  // ← incluido en el JWT
      verified: user.emailVerified,
    };

    return this.jwtService.sign(payload);
  }

  private async generateApiKey(userId: number): Promise<UserKey> {
    const apiKey = `jk_${crypto.randomBytes(32).toString('hex')}`;

    const userKey = this.userKeyRepository.create({
      keyValue: apiKey,
      userId,
      used: true,
    });

    return this.userKeyRepository.save(userKey);
  }
}