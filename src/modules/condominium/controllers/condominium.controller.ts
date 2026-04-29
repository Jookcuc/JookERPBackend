import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guard/jwt-auth.guard';
import { CreateCondominiumDto } from '../dto/create-condominium.dto';
import {
  CondominiumDetailResponseDto,
  CondominiumSummaryResponseDto,
} from '../dto/condominium-response.dto';
import { UpdateCondominiumDto } from '../dto/update-condominium.dto';
import { CondominiumService } from '../services/condominium.service';

@ApiTags('Condominium Management')
@ApiBearerAuth('JWT-auth')
@Controller('condominiums')
@UseGuards(JwtAuthGuard)
export class CondominiumController {
  constructor(private readonly condominiumService: CondominiumService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo condominio',
    description:
      'Registra un condominio para la empresa autenticada. La estructura interna se administra por endpoints separados de unidades estructurales.',
  })
  @ApiCreatedResponse({
    description: 'Condominio creado exitosamente.',
    type: CondominiumDetailResponseDto,
  })
  async create(@Body() createDto: CreateCondominiumDto, @Request() req) {
    return await this.condominiumService.create(createDto, req.user.companyId);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar condominios de la empresa',
    description:
      'Retorna todos los condominios asociados a la empresa del usuario autenticado junto con sus unidades estructurales.',
  })
  @ApiOkResponse({
    description: 'Listado de condominios obtenido correctamente.',
    type: CondominiumSummaryResponseDto,
    isArray: true,
  })
  async findAll(@Request() req) {
    return await this.condominiumService.findAll(req.user.companyId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener detalle de un condominio',
    description:
      'Consulta un condominio por ID dentro del contexto de la empresa autenticada, incluyendo torres, bloques y unidades privadas relacionadas.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
    description: 'ID del condominio a consultar.',
  })
  @ApiOkResponse({
    description: 'Detalle del condominio.',
    type: CondominiumDetailResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'No existe un condominio con ese ID para la empresa autenticada.',
  })
  async findOne(@Param('id') id: string, @Request() req) {
    return await this.condominiumService.findOne(+id, req.user.companyId);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Editar condominio',
    description:
      'Actualiza los datos generales del condominio sin modificar sus unidades estructurales.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
    description: 'ID del condominio a editar.',
  })
  @ApiOkResponse({
    description: 'Condominio actualizado correctamente.',
    type: CondominiumDetailResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'No existe un condominio con ese ID para la empresa autenticada.',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCondominiumDto,
    @Request() req,
  ) {
    return await this.condominiumService.update(+id, dto, req.user.companyId);
  }
}
