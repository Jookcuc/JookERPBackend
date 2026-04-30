import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CondoFee, FeeStatus, FeeType } from '../entities/condo-fee.entity';
import { PropertyUnit } from '../entities/property-unit.entity';
import { StructuralUnit } from '../entities/structural-unit.entity';
import { GenerateFeesDto } from '../dto/generate-fees.dto';

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

  async generateMonthlyFees(data: GenerateFeesDto) {
    const { condominiumId, period, totalAmount, structuralUnitAllocations } =
      data;

    const structuralUnits = await this.structuralUnitRepository.find({
      where: {
        condominiumId,
        id: In(structuralUnitAllocations.map((item) => item.structuralUnitId)),
      },
      relations: ['propertyUnits'],
    });

    if (structuralUnits.length === 0) {
      return { message: 'No structural units found' };
    }

    if (structuralUnits.length !== structuralUnitAllocations.length) {
      throw new BadRequestException(
        'One or more structural units do not belong to this condominium',
      );
    }

    const requestedIds = new Set(
      structuralUnitAllocations.map((item) => item.structuralUnitId),
    );

    if (requestedIds.size !== structuralUnitAllocations.length) {
      throw new BadRequestException(
        'Structural unit allocations cannot contain duplicate structuralUnitId values',
      );
    }

    const distributedTotal = structuralUnitAllocations.reduce(
      (acc, item) => acc + Number(item.amount),
      0,
    );

    if (
      totalAmount !== undefined &&
      Number(totalAmount.toFixed(2)) !== Number(distributedTotal.toFixed(2))
    ) {
      throw new BadRequestException(
        'The totalAmount must match the sum of the structural unit allocations',
      );
    }

    const allUnits = structuralUnits.flatMap((item) => item.propertyUnits);

    if (allUnits.length === 0) {
      throw new BadRequestException(
        'No property units found in the selected structural units',
      );
    }

    const existingFees = await this.condoFeeRepository.find({
      where: {
        propertyUnitId: In(allUnits.map((unit) => unit.id)),
        period,
        type: FeeType.ORDINARIA,
      },
    });

    if (existingFees.length > 0) {
      throw new BadRequestException(`Fees for period ${period} already exist`);
    }

    const structuralUnitsById = new Map(
      structuralUnits.map((structuralUnit) => [
        structuralUnit.id,
        structuralUnit,
      ]),
    );

    const feesToCreate = structuralUnitAllocations.flatMap((allocation) => {
      const structuralUnit = structuralUnitsById.get(
        allocation.structuralUnitId,
      );

      if (!structuralUnit || structuralUnit.propertyUnits.length === 0) {
        throw new BadRequestException(
          `Structural unit ${allocation.structuralUnitId} has no property units`,
        );
      }

      const splitUnits = this.splitAmountAcrossUnits(
        allocation.amount,
        structuralUnit.propertyUnits,
      );

      return splitUnits.map(({ unit, amount }) =>
        this.condoFeeRepository.create({
          propertyUnitId: unit.id,
          amount,
          period,
          dueDate: new Date(
            new Date().getFullYear(),
            new Date().getMonth() + 1,
            5,
          ),
          type: FeeType.ORDINARIA,
          status: FeeStatus.PENDIENTE,
          description: `Cuota ordinaria periodo ${period} - ${structuralUnit.name}`,
        }),
      );
    });

    return await this.condoFeeRepository.save(feesToCreate);
  }

  async getUnitStatement(propertyUnitId: number) {
    return await this.condoFeeRepository.find({
      where: { propertyUnitId },
      order: { period: 'DESC', createdAt: 'DESC' },
    });
  }

  async getCondominiumPortfolio(condominiumId: number) {
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

            const pendingFeesCount = fees.filter(
              (f) => f.status !== FeeStatus.PAGADA,
            ).length;

            return {
              unitNumber: unit.number,
              type: unit.type,
              status: unit.status,
              totalDue,
              pendingFeesCount,
              lastFees: fees.slice(0, 3),
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

  private splitAmountAcrossUnits(
    totalAmount: number,
    items: PropertyUnit[],
  ): Array<{ unit: PropertyUnit; amount: number }> {
    if (items.length === 0) {
      return [];
    }

    const totalInCents = Math.round(Number(totalAmount) * 100);
    const baseShare = Math.floor(totalInCents / items.length);
    let assigned = 0;

    return items.map((item, index) => {
      let cents = 0;

      if (index === items.length - 1) {
        cents = totalInCents - assigned;
      } else {
        cents = baseShare;
        assigned += cents;
      }

      return {
        unit: item,
        amount: Number((cents / 100).toFixed(2)),
      };
    });
  }
}
