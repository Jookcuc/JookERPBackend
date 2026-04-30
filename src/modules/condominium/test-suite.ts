import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { CondominiumService } from './services/condominium.service';
import { BillingService } from './services/billing.service';
import { OperationService } from './services/operation.service';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { StructuralUnitType } from './entities/structural-unit.entity';
import { PropertyUnitType } from './entities/property-unit.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { StructuralUnit } from './entities/structural-unit.entity';
import { PropertyUnit } from './entities/property-unit.entity';
import { Repository } from 'typeorm';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Condominium Test Suite')
@ApiBearerAuth('JWT-auth')
@Controller('condo-test')
@UseGuards(JwtAuthGuard)
export class CondominiumTestController {
  constructor(
    private readonly condoService: CondominiumService,
    private readonly billingService: BillingService,
    private readonly opService: OperationService,
    @InjectRepository(StructuralUnit)
    private readonly sUnitRepo: Repository<StructuralUnit>,
    @InjectRepository(PropertyUnit)
    private readonly pUnitRepo: Repository<PropertyUnit>,
  ) {}

  @Get('run-full-test')
  @ApiOperation({
    summary: 'Automatically creates dummy data and tests all condominium logic',
  })
  async runTest(@Request() req) {
    const companyId = req.user.companyId;
    const results: any[] = [];

    try {
      const condo = await this.condoService.create(
        {
          name: 'Test Residencial Jook',
          address: 'Calle Falsa 123',
          nit: '123456789-0',
        },
        companyId,
      );
      results.push({ step: 'Create Condo', status: 'OK', data: condo });

      const tower = this.sUnitRepo.create({
        condominiumId: condo.id,
        name: 'Torre Pruebas',
        type: StructuralUnitType.TORRE,
      });
      const savedTower = await this.sUnitRepo.save(tower);
      results.push({ step: 'Create Tower', status: 'OK', id: savedTower.id });

      const unit1 = this.pUnitRepo.create({
        structuralUnitId: savedTower.id,
        number: '101',
        type: PropertyUnitType.APARTAMENTO,
      });
      const unit2 = this.pUnitRepo.create({
        structuralUnitId: savedTower.id,
        number: '102',
        type: PropertyUnitType.APARTAMENTO,
      });
      await this.pUnitRepo.save([unit1, unit2]);
      results.push({ step: 'Create Units', status: 'OK' });

      const fees: any = await this.billingService.generateMonthlyFees({
        condominiumId: condo.id,
        period: '2026-06',
        totalAmount: 1000000,
        structuralUnitAllocations: [
          {
            structuralUnitId: savedTower.id,
            amount: 1000000,
          },
        ],
      });
      results.push({
        step: 'Generate Fees',
        status: 'OK',
        count: fees.length,
        sampleAmount: fees[0]?.amount,
      });

      const portfolio = await this.billingService.getCondominiumPortfolio(
        condo.id,
      );
      results.push({
        step: 'Check Portfolio',
        status: 'OK',
        towers: portfolio.length,
      });

      const entry = await this.opService.registerEntry(
        unit1.id,
        'Visitante de Prueba',
        '123456',
      );
      results.push({ step: 'Register Entry', status: 'OK', logId: entry.id });

      await this.opService.registerExit(entry.id);
      results.push({ step: 'Register Exit', status: 'OK' });

      return {
        success: true,
        message: 'All tests passed successfully',
        summary: results,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Test failed at some point',
        error: error.message,
        summary: results,
      };
    }
  }
}
