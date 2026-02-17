import { IsEmail, IsNotEmpty, IsString, MinLength, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'Luis Alejandro',
    description: 'Nombre del usuario',
  })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  firstName: string;

  @ApiProperty({
    example: 'Vergel Irlet',
    description: 'Apellido del usuario',
  })
  @IsNotEmpty({ message: 'El apellido es requerido' })
  @IsString()
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  lastName: string;

  @ApiProperty({
    example: 'example@gmail.com',
    description: 'Email del usuario',
  })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @ApiProperty({
    example: 'AKJ443',
    description: 'Llave de uso para registro',
  })
  @IsNotEmpty({ message: 'La llave de uso es requerida' })
  @IsString()
  useKey: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Contraseña (mínimo 8 caracteres, debe incluir mayúsculas, minúsculas, números y símbolos)',
  })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'La contraseña debe contener al menos: una mayúscula, una minúscula, un número y un símbolo (@$!%*?&)',
    },
  )
  password: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Confirmación de contraseña',
  })
  @IsNotEmpty({ message: 'Confirmar contraseña es requerido' })
  confirmPassword: string;
}