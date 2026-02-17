import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Registrar nuevo usuario',
    description:
      'Crea una nueva cuenta de usuario. Requiere una llave de uso válida. Envía un código de verificación al email proporcionado que expira en 90 segundos.',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
    schema: {
      example: {
        success: true,
        message:
          'Usuario registrado exitosamente. Por favor verifica tu email para continuar.',
        data: {
          email: 'example@gmail.com',
          userId: 1,
          codeExpiresInSeconds: 90,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o llave de uso incorrecta',
  })
  @ApiResponse({
    status: 409,
    description: 'Email ya registrado',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar email con código',
    description:
      'Verifica el email del usuario usando el código de 6 dígitos enviado. Al verificar exitosamente, se genera un token JWT y una API Key.',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verificado exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Email verificado exitosamente. ¡Bienvenido a Jook ERP!',
        data: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          apiKey: 'jk_a1b2c3d4e5f6...',
          user: {
            id: 1,
            firstName: 'Luis Alejandro',
            lastName: 'Vergel Irlet',
            email: 'example@gmail.com',
            emailVerified: true,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Código inválido o expirado',
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Inicia sesión con email y contraseña. Requiere que el email esté verificado. Retorna un token JWT para autenticación.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
    schema: {
      example: {
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          apiKey: 'jk_a1b2c3d4e5f6...',
          user: {
            id: 1,
            firstName: 'Luis Alejandro',
            lastName: 'Vergel Irlet',
            email: 'example@gmail.com',
            role: 'user',
            emailVerified: true,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas o email no verificado',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('resend-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reenviar código de verificación',
    description:
      'Envía un nuevo código de verificación al email del usuario. Invalida códigos anteriores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Código reenviado exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Código de verificación reenviado exitosamente',
        data: {
          email: 'example@gmail.com',
          codeExpiresInSeconds: 90,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Usuario no encontrado o email ya verificado',
  })
  async resendCode(@Body() resendCodeDto: ResendCodeDto) {
    return this.authService.resendVerificationCode(resendCodeDto.email);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener perfil del usuario autenticado',
    description:
      'Retorna la información del perfil del usuario actual. Requiere autenticación con token JWT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil obtenido exitosamente',
    schema: {
      example: {
        id: 1,
        firstName: 'Luis Alejandro',
        lastName: 'Vergel Irlet',
        email: 'example@gmail.com',
        role: 'user',
        emailVerified: true,
        apiKey: 'jk_a1b2c3d4e5f6...',
        createdAt: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }

  @Public()
  @Post('test-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[DESARROLLO] Probar envío de email',
    description: 'Endpoint de prueba para verificar la configuración de Brevo',
  })
  async testEmail(@Body() body: { email: string; name: string }) {
    const code = '123456';
    return {
      message: 'Email de prueba programado',
    };
  }
}