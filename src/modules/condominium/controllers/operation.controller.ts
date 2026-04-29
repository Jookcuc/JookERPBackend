import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { OperationService } from '../services/operation.service';
import { JwtAuthGuard } from '../../../common/guard/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateMaintenanceTicketDto } from '../dto/create-maintenance-ticket.dto';
import {
  AccessLogResponseDto,
  CommunicationResponseDto,
  MaintenanceTicketResponseDto,
  UpdateResultResponseDto,
} from '../dto/condominium-response.dto';
import { RegisterAccessEntryDto } from '../dto/register-access-entry.dto';
import { UpdateTicketStatusDto } from '../dto/update-ticket-status.dto';

@ApiTags('Condominium Operations')
@ApiBearerAuth('JWT-auth')
@Controller('condo-operations')
@UseGuards(JwtAuthGuard)
export class OperationController {
  constructor(private readonly operationService: OperationService) {}

  @Post('access/entry')
  @ApiOperation({
    summary: 'Registrar ingreso de visitante',
    description:
      'Crea un registro de acceso con la unidad privada relacionada, el nombre del visitante y datos opcionales de identificación o vehículo.',
  })
  @ApiCreatedResponse({
    description: 'Ingreso del visitante registrado correctamente.',
    type: AccessLogResponseDto,
  })
  async registerEntry(@Body() data: RegisterAccessEntryDto) {
    return await this.operationService.registerEntry(
      data.unitId,
      data.name,
      data.document,
      data.plate,
    );
  }

  @Put('access/exit/:id')
  @ApiOperation({
    summary: 'Registrar salida de visitante',
    description:
      'Marca la hora de salida del registro de acceso indicado. Devuelve el resultado de la actualización en base de datos.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 3001,
    description: 'ID del registro de acceso.',
  })
  @ApiOkResponse({
    description: 'Salida del visitante registrada correctamente.',
    type: UpdateResultResponseDto,
  })
  async registerExit(@Param('id') id: string) {
    return await this.operationService.registerExit(+id);
  }

  @Post('tickets')
  @ApiOperation({
    summary: 'Crear ticket de mantenimiento o PQRS',
    description:
      'Registra una novedad, solicitud, queja o caso de mantenimiento para un condominio. El estado inicial se crea automáticamente como `ABIERTO`.',
  })
  @ApiCreatedResponse({
    description: 'Ticket creado correctamente.',
    type: MaintenanceTicketResponseDto,
  })
  async createTicket(@Body() data: CreateMaintenanceTicketDto) {
    return await this.operationService.createTicket(data);
  }

  @Put('tickets/:id/status')
  @ApiOperation({
    summary: 'Actualizar estado de ticket',
    description:
      'Cambia el estado operativo de un ticket de mantenimiento o PQRS existente.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 820,
    description: 'ID del ticket a actualizar.',
  })
  @ApiOkResponse({
    description: 'Estado del ticket actualizado correctamente.',
    type: UpdateResultResponseDto,
  })
  async updateTicketStatus(
    @Param('id') id: string,
    @Body() data: UpdateTicketStatusDto,
  ) {
    return await this.operationService.updateTicketStatus(+id, data.status);
  }

  @Get('communications/:condoId')
  @ApiOperation({
    summary: 'Consultar comunicaciones publicadas',
    description:
      'Obtiene las comunicaciones activas y publicadas de un condominio, ordenadas de la más reciente a la más antigua.',
  })
  @ApiParam({
    name: 'condoId',
    type: Number,
    example: 1,
    description: 'ID del condominio.',
  })
  @ApiOkResponse({
    description: 'Listado de comunicaciones activas.',
    type: CommunicationResponseDto,
    isArray: true,
  })
  async getCommunications(@Param('condoId') condoId: string) {
    return await this.operationService.getActiveCommunications(+condoId);
  }
}
