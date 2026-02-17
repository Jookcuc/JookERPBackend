import { IsEmail, IsNotEmpty, IsString, MinLength, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    example: '123456',
    description: 'Código de verificación de 6 dígitos',
  })
  @IsNotEmpty({ message: 'El código es requerido' })
  @IsString()
  @Length(6, 6, { message: 'El código debe tener exactamente 6 dígitos' })
  @Matches(/^\d{6}$/, { message: 'El código debe contener solo números' })
  code: string;

  @ApiProperty({
    example: 'example@gmail.com',
    description: 'Email del usuario a verificar',
  })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;
}