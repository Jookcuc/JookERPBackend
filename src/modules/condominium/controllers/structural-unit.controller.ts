import {
  Body,
  Controller,
  Delete,
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
import { CreateStructuralUnitDto } from '../dto/create-structural-unit.dto';
import { StructuralUnitDetailResponseDto } from '../dto/condominium-response.dto';
import { UpdateStructuralUnitDto } from '../dto/update-structural-unit.dto';
import { StructuralUnitService } from '../services/structural-unit.service';

@ApiTags('Condominium Structural Units')
@ApiBearerAuth('JWT-auth')
@Controller('condo-structural-units')
@UseGuards(JwtAuthGuard)
export class StructuralUnitController {
  constructor(private readonly structuralUnitService: StructuralUnitService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear unidad estructural',
    description:
      'Crea una torre, bloque, etapa o manzana y solicita el `condominiumId` en el body. Opcionalmente puede crear unidades privadas iniciales dentro de la misma solicitud.',
  })
  @ApiCreatedResponse({
    description: 'Unidad estructural creada correctamente.',
    type: StructuralUnitDetailResponseDto,
  })
  async create(@Body() dto: CreateStructuralUnitDto, @Request() req) {
    return await this.structuralUnitService.create(dto, req.user.companyId);
  }

  @Get('condominium/:condominiumId')
  @ApiOperation({
    summary: 'Listar unidades estructurales por condominio',
    description:
      'Obtiene todas las unidades estructurales asociadas a un condominio de la empresa autenticada.',
  })
  @ApiParam({
    name: 'condominiumId',
    type: Number,
    example: 1,
    description: 'ID del condominio.',
  })
  @ApiOkResponse({
    description: 'Listado de unidades estructurales.',
    type: StructuralUnitDetailResponseDto,
    isArray: true,
  })
  async findByCondominium(
    @Param('condominiumId') condominiumId: string,
    @Request() req,
  ) {
    return await this.structuralUnitService.findByCondominium(
      +condominiumId,
      req.user.companyId,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener detalle de unidad estructural',
    description:
      'Consulta una unidad estructural específica junto con sus unidades privadas.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 14,
    description: 'ID de la unidad estructural.',
  })
  @ApiOkResponse({
    description: 'Detalle de la unidad estructural.',
    type: StructuralUnitDetailResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'No existe una unidad estructural con ese ID para la empresa autenticada.',
  })
  async findOne(@Param('id') id: string, @Request() req) {
    return await this.structuralUnitService.findOne(+id, req.user.companyId);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Editar unidad estructural',
    description:
      'Actualiza los datos generales de una unidad estructural. Si se envia `condominiumId`, la unidad se reasigna a otro condominio de la misma empresa.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 14,
    description: 'ID de la unidad estructural a editar.',
  })
  @ApiOkResponse({
    description: 'Unidad estructural actualizada correctamente.',
    type: StructuralUnitDetailResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStructuralUnitDto,
    @Request() req,
  ) {
    return await this.structuralUnitService.update(
      +id,
      dto,
      req.user.companyId,
    );
  }

  @Delete('property-unit/:propertyUnitId')
  @ApiOperation({
    summary: 'Eliminar unidad privada',
    description:
      'Elimina un apartamento, local, parqueadero u otra unidad privada junto con sus cuotas, registros de acceso y perfiles de residentes asociados.',
  })
  @ApiParam({
    name: 'propertyUnitId',
    type: Number,
    example: 101,
    description: 'ID de la unidad privada a eliminar.',
  })
  @ApiOkResponse({
    description: 'Unidad privada eliminada correctamente.',
  })
  @ApiNotFoundResponse({
    description:
      'No existe una unidad privada con ese ID para la empresa autenticada.',
  })
  async removePropertyUnit(
    @Param('propertyUnitId') propertyUnitId: string,
    @Request() req,
  ) {
    await this.structuralUnitService.removePropertyUnit(
      +propertyUnitId,
      req.user.companyId,
    );
    return { message: 'Property unit deleted successfully' };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar unidad estructural',
    description:
      'Elimina una torre, bloque, etapa o manzana junto con todas sus unidades privadas y registros asociados (cuotas, accesos, perfiles de residentes).',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 14,
    description: 'ID de la unidad estructural a eliminar.',
  })
  @ApiOkResponse({
    description: 'Unidad estructural eliminada correctamente.',
  })
  @ApiNotFoundResponse({
    description:
      'No existe una unidad estructural con ese ID para la empresa autenticada.',
  })
  async remove(@Param('id') id: string, @Request() req) {
    await this.structuralUnitService.remove(+id, req.user.companyId);
    return { message: 'Structural unit deleted successfully' };
  }
}
