import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UseKeysService } from './use-keys.service';
import { GenerateUseKeyDto, GenerateMultipleKeysDto } from './dto/use-keys.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guard/roles.guard';

@ApiTags('Admin - Use Keys')
@ApiBearerAuth('JWT-auth')
@Controller('admin/use-keys')
@UseGuards(RolesGuard)
@Roles('admin')
export class UseKeysController {
  constructor(private readonly useKeysService: UseKeysService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generar una llave de uso' })
  @ApiResponse({ status: 201, description: 'Llave generada exitosamente' })
  async generateKey(@Body() dto: GenerateUseKeyDto) {
    return this.useKeysService.generateUseKey(dto);
  }

  @Post('generate/multiple')
  @ApiOperation({ summary: 'Generar múltiples llaves de uso' })
  @ApiResponse({ status: 201, description: 'Llaves generadas exitosamente' })
  async generateMultipleKeys(@Body() dto: GenerateMultipleKeysDto) {
    return this.useKeysService.generateMultipleKeys(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las llaves' })
  @ApiResponse({ status: 200, description: 'Lista de llaves obtenida' })
  async getAllKeys() {
    return this.useKeysService.getAllKeys();
  }

  @Get('available')
  @ApiOperation({ summary: 'Obtener llaves disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de llaves disponibles' })
  async getAvailableKeys() {
    return this.useKeysService.getAvailableKeys();
  }

  @Get('used')
  @ApiOperation({ summary: 'Obtener llaves usadas' })
  @ApiResponse({ status: 200, description: 'Lista de llaves usadas' })
  async getUsedKeys() {
    return this.useKeysService.getUsedKeys();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de llaves' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas' })
  async getStats() {
    return this.useKeysService.getKeysStats();
  }

  @Delete(':keyValue')
  @ApiOperation({ summary: 'Eliminar una llave' })
  @ApiResponse({ status: 200, description: 'Llave eliminada' })
  async deleteKey(@Param('keyValue') keyValue: string) {
    return this.useKeysService.deleteKey(keyValue);
  }

  @Post('clean-expired')
  @ApiOperation({ summary: 'Limpiar llaves expiradas' })
  @ApiResponse({ status: 200, description: 'Llaves expiradas eliminadas' })
  async cleanExpired() {
    return this.useKeysService.cleanExpiredKeys();
  }
}