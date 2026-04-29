import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { BillingService } from '../services/billing.service';
import { JwtAuthGuard } from '../../../common/guard/jwt-auth.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { GenerateFeesDto } from '../dto/generate-fees.dto';
import {
  CondoFeeResponseDto,
  EmptyStructuralUnitsResponseDto,
  PortfolioTowerResponseDto,
} from '../dto/condominium-response.dto';

@ApiTags('Condominium Billing')
@ApiBearerAuth('JWT-auth')
@Controller('condo-billing')
@UseGuards(JwtAuthGuard)
@ApiExtraModels(CondoFeeResponseDto, EmptyStructuralUnitsResponseDto)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('generate-fees')
  @ApiOperation({
    summary: 'Generar cuotas mensuales de administración',
    description:
      'Genera cuotas ordinarias para las unidades privadas del condominio en el periodo indicado. El body permite definir un presupuesto por cada unidad estructural y, opcionalmente, validar que la suma coincida con un total general del periodo.',
  })
  @ApiCreatedResponse({
    description:
      'Cuotas generadas correctamente. Si el condominio todavía no tiene unidades estructurales, devuelve un mensaje informativo.',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(EmptyStructuralUnitsResponseDto) },
        {
          type: 'array',
          items: { $ref: getSchemaPath(CondoFeeResponseDto) },
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description:
      'No hay unidades privadas en el condominio o ya existen cuotas para el periodo solicitado.',
  })
  async generateFees(@Body() data: GenerateFeesDto) {
    return await this.billingService.generateMonthlyFees(data);
  }

  @Get('statement/:unitId')
  @ApiOperation({
    summary: 'Consultar estado de cuenta por unidad privada',
    description:
      'Lista el historial de cuotas de una unidad privada, ordenado del periodo más reciente al más antiguo.',
  })
  @ApiParam({
    name: 'unitId',
    type: Number,
    example: 101,
    description: 'ID de la unidad privada.',
  })
  @ApiOkResponse({
    description: 'Estado de cuenta de la unidad privada.',
    type: CondoFeeResponseDto,
    isArray: true,
  })
  async getStatement(@Param('unitId') unitId: string) {
    return await this.billingService.getUnitStatement(+unitId);
  }

  @Get('portfolio/:condoId')
  @ApiOperation({
    summary: 'Consultar cartera consolidada del condominio',
    description:
      'Agrupa la cartera por torre o bloque y resume saldo pendiente, número de cuotas vencidas y últimas cuotas registradas por unidad privada.',
  })
  @ApiParam({
    name: 'condoId',
    type: Number,
    example: 1,
    description: 'ID del condominio a consultar.',
  })
  @ApiOkResponse({
    description: 'Reporte consolidado de cartera por unidad estructural.',
    type: PortfolioTowerResponseDto,
    isArray: true,
  })
  async getPortfolio(@Param('condoId') condoId: string) {
    return await this.billingService.getCondominiumPortfolio(+condoId);
  }
}
