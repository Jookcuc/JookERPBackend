import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CondoFee, FeeStatus, FeeType } from '../entities/condo-fee.entity';
import { PropertyUnit } from '../entities/property-unit.entity';
import { StructuralUnit } from '../entities/structural-unit.entity';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(CondoFee)
    private readonly condoFeeRepository: Repository<CondoFee>,
    @InjectRepository(PropertyUnit)
    private readonly propertyUnitRepository: Repository<PropertyUnit>,
    @InjectRepository(StructuralUnit)
    private readonly structuralUnitRepository: Repository<StructuralUnit>,
  ) {}

  /**
   * Generates monthly fees for all units in a condominium.
   * @param condominiumId 
   * @param period YYYY-MM
   * @param baseAmount Total amount to distribute or fixed amount per unit
   */
  async generateMonthlyFees(
    condominiumId: number,
    period: string,
    baseAmount: number,
    useCoefficient: boolean = true,
  ) {
    // Check if fees already exist for this period
    const structuralUnits = await this.structuralUnitRepository.find({
      where: { condominiumId },
    });
    const structuralUnitIds = structuralUnits.map((u) => u.id);

    if (structuralUnitIds.length === 0) return { message: 'No structural units found' };

    const units = await this.propertyUnitRepository.find({
      where: { structuralUnitId: In(structuralUnitIds) },
    });

    if (units.length === 0) {
      throw new BadRequestException('No property units found in this condominium');
    }

    const existingFees = await this.condoFeeRepository.find({
      where: {
        propertyUnitId: In(units.map((u) => u.id)),
        period,
        type: FeeType.ORDINARIA,
      },
    });

    if (existingFees.length > 0) {
      throw new BadRequestException(`Fees for period ${period} already exist`);
    }

    const feesToCreate = units.map((unit) => {
      let amount = baseAmount;
      if (useCoefficient) {
        // distribute based on coefficient (percentage)
        // Usually: (Total Budget * unit coefficient) / 100
        amount = Number(((baseAmount * Number(unit.coefficientPercentage)) / 100).toFixed(2));
      }

      return this.condoFeeRepository.create({
        propertyUnitId: unit.id,
        amount,
        period,
        dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5), // Next month 5th
        type: FeeType.ORDINARIA,
        status: FeeStatus.PENDIENTE,
        description: `Cuota ordinaria periodo ${period}`,
      });
    });

    return await this.condoFeeRepository.save(feesToCreate);
  }

  async getUnitStatement(propertyUnitId: number) {
    return await this.condoFeeRepository.find({
      where: { propertyUnitId },
      order: { period: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Returns a list of all units in a condominium with their total balance and state.
   */
  async getCondominiumPortfolio(condominiumId: number) {
    // This is a simplified version. Usually involves complex joins.
    const structuralUnits = await this.structuralUnitRepository.find({
      where: { condominiumId },
      relations: ['propertyUnits'],
    });

    const report = await Promise.all(
      structuralUnits.map(async (tower) => {
        const unitsWithBalance = await Promise.all(
          tower.propertyUnits.map(async (unit) => {
            const fees = await this.condoFeeRepository.find({
              where: { propertyUnitId: unit.id },
            });

            const totalDue = fees.reduce((acc, f) => {
              if (f.status !== FeeStatus.PAGADA) return acc + Number(f.amount);
              return acc;
            }, 0);

            const pendingFeesCount = fees.filter((f) => f.status !== FeeStatus.PAGADA).length;

            return {
              unitNumber: unit.number,
              type: unit.type,
              status: unit.status,
              totalDue,
              pendingFeesCount,
              lastFees: fees.slice(0, 3), // return last 3
            };
          }),
        );

        return {
          towerName: tower.name,
          towerType: tower.type,
          units: unitsWithBalance,
        };
      }),
    );

    return report;
  }
}
