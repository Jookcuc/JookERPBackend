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
  ) { }

  async register(registerDto: RegisterDto) {
    const { firstName, lastName, email, password, confirmPassword, useKey } =
      registerDto;
    if (password !== confirmPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const userKey = await this.userKeyRepository.findOne({
      where: { keyValue: useKey, used: false },
    });

    if (!userKey) {
      throw new BadRequestException('Llave de uso inválida o ya utilizada');
    }

    if (userKey.expiresAt && new Date() > userKey.expiresAt) {
      throw new BadRequestException('La llave de uso ha expirado');
    }


    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear el usuario
    const user = this.userRepository.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      emailVerified: false,
      idRole: 1, // Role por defecto: usuario estándar (ajusta según tu lógica)
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
      // Eliminar usuario si no se puede enviar el email
      await this.userRepository.delete(savedUser.id);
      await this.userKeyRepository.update(userKey.idKey, { used: false });
      throw new BadRequestException(
        'No se pudo enviar el email de verificación. Por favor, intenta nuevamente.',
      );
    }

    return {
      success: true,
      message:
        'Usuario registrado exitosamente. Por favor verifica tu email para continuar.',
      data: {
        email: savedUser.email,
        userId: savedUser.id,
        codeExpiresInSeconds: 90,
      },
    };
  }

  /**
   * Verifica el email del usuario con el código recibido
   * Genera token JWT y API Key al verificar exitosamente
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { code, email } = verifyEmailDto;

    // Buscar el usuario
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (user.emailVerified) {
      throw new BadRequestException('El email ya ha sido verificado');
    }

    // Buscar el código de verificación válido
    const verificationCode = await this.verificationCodeRepository.findOne({
      where: {
        userId: user.id,
        code,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!verificationCode) {
      throw new BadRequestException(
        'Código inválido o expirado. Por favor solicita un nuevo código.',
      );
    }

    // Marcar el código como usado
    verificationCode.used = true;
    await this.verificationCodeRepository.save(verificationCode);

    // Marcar el email como verificado
    user.emailVerified = true;
    user.updatedAt = new Date();
    await this.userRepository.save(user);

    this.logger.log(`Email verificado: ${user.email}`);

    // Generar token JWT
    const token = await this.generateToken(user);

    // Generar API Key única para el usuario
    const apiKey = await this.generateApiKey(user.id);

    // Enviar email de bienvenida (opcional, no bloqueante)
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
          emailVerified: user.emailVerified,
        },
      },
    };
  }

  /**
   * Inicia sesión con email y contraseña
   * Requiere que el email esté verificado
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Buscar usuario con su role
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar si el email está verificado
    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Por favor verifica tu email antes de iniciar sesión. Revisa tu bandeja de entrada.',
      );
    }

    this.logger.log(`Login exitoso: ${user.email}`);

    // Generar token
    const token = await this.generateToken(user);

    // Obtener API Key del usuario
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
          emailVerified: user.emailVerified,
        },
      },
    };
  }

  /**
   * Reenvía el código de verificación al usuario
   * Invalida códigos anteriores y genera uno nuevo
   */
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

    // Invalidar códigos anteriores no usados
    await this.verificationCodeRepository.update(
      { userId: user.id, used: false },
      { used: true },
    );

    // Generar nuevo código
    const verificationCode = await this.generateVerificationCode(user.id);

    // Enviar email
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

  /**
   * Genera un código de verificación de 6 dígitos
   * Válido por 90 segundos
   */
  private async generateVerificationCode(
    userId: number,
  ): Promise<EmailVerificationCode> {
    // Generar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Calcular tiempo de expiración (90 segundos)
    const expirySeconds = this.configService.get<number>(
      'VERIFICATION_CODE_EXPIRY_SECONDS',
      90,
    );
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expirySeconds);

    const verificationCode = this.verificationCodeRepository.create({
      userId,
      code,
      expiresAt,
    });

    return await this.verificationCodeRepository.save(verificationCode);
  }

  /**
   * Genera un JWT token para el usuario
   */
  private async generateToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.idRole,
      verified: user.emailVerified,
    };
    const secret = this.configService.get<string>('JWT_SECRET');

    return this.jwtService.sign(payload);
  }

  /**
   * Genera una API Key única para el usuario
   * Formato: jk_[64 caracteres hexadecimales]
   */
  private async generateApiKey(userId: number): Promise<UserKey> {
    // Generar API Key única con prefijo
    const apiKey = `jk_${crypto.randomBytes(32).toString('hex')}`;

    const userKey = this.userKeyRepository.create({
      keyValue: apiKey,
      userId,
      used: true,
    });

    return await this.userKeyRepository.save(userKey);
  }

  /**
   * Valida el token JWT y retorna el usuario
   */
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

  /**
   * Limpia códigos de verificación expirados
   * Ejecutar periódicamente con un cron job
   */
  async cleanExpiredCodes(): Promise<number> {
    const result = await this.verificationCodeRepository.delete({
      expiresAt: MoreThan(new Date()),
    });

    const deletedCount = result.affected || 0;
    this.logger.log(`Códigos expirados eliminados: ${deletedCount}`);
    return deletedCount;
  }

  /**
   * Obtiene el perfil del usuario autenticado
   */
  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    // Obtener API Key
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
      emailVerified: user.emailVerified,
      apiKey: apiKey?.keyValue,
      createdAt: user.createdAt,
    };
  }
}