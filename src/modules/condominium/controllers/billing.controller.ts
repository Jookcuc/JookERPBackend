import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { BillingService } from '../services/billing.service';
import { JwtAuthGuard } from '../../../common/guard/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GenerateFeesDto } from '../dto/generate-fees.dto';

@ApiTags('Condominium Billing')
@ApiBearerAuth('JWT-auth')
@Controller('condo-billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('generate-fees')
  @ApiOperation({ summary: 'Batch generate monthly administration fees' })
  async generateFees(@Body() data: GenerateFeesDto) {
    return await this.billingService.generateMonthlyFees(
      data.condominiumId,
      data.period,
      data.baseAmount,
      data.useCoefficient
    );
  }

  @Get('statement/:unitId')
  @ApiOperation({ summary: 'Get account statement for a property unit' })
  async getStatement(@Param('unitId') unitId: string) {
    return await this.billingService.getUnitStatement(+unitId);
  }

  @Get('portfolio/:condoId')
  @ApiOperation({ summary: 'Get full portfolio report for a condominium' })
  async getPortfolio(@Param('condoId') condoId: string) {
    return await this.billingService.getCondominiumPortfolio(+condoId);
  }
}
