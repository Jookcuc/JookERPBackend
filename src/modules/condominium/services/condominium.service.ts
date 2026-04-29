import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Condominium } from '../entities/condominium.entity';
import { CreateCondominiumDto } from '../dto/create-condominium.dto';
import { StructuralUnit } from '../entities/structural-unit.entity';
import { PropertyUnit } from '../entities/property-unit.entity';

@Injectable()
export class CondominiumService {
  constructor(
    @InjectRepository(Condominium)
    private readonly condominiumRepository: Repository<Condominium>,
  ) {}

  async create(
    createDto: CreateCondominiumDto,
    companyId: number,
  ): Promise<Condominium> {
    const { structuralUnits = [], ...condominiumData } = createDto;

    const condominiumId = await this.condominiumRepository.manager.transaction(
      async (manager) => {
        const condominium = await manager.save(
          Condominium,
          manager.create(Condominium, {
            ...condominiumData,
            companyId,
          }),
        );

        for (const structuralUnitDto of structuralUnits) {
          const { propertyUnits = [], ...structuralUnitData } =
            structuralUnitDto;

          const structuralUnit = await manager.save(
            StructuralUnit,
            manager.create(StructuralUnit, {
              ...structuralUnitData,
              condominiumId: condominium.id,
            }),
          );

          if (propertyUnits.length > 0) {
            const propertyUnitsToCreate = propertyUnits.map((propertyUnit) =>
              manager.create(PropertyUnit, {
                ...propertyUnit,
                structuralUnitId: structuralUnit.id,
              }),
            );

            await manager.save(PropertyUnit, propertyUnitsToCreate);
          }
        }

        return condominium.id;
      },
    );

    return await this.findOne(condominiumId, companyId);
  }

  async findAll(companyId: number): Promise<Condominium[]> {
    return await this.condominiumRepository.find({
      where: { companyId },
      relations: ['structuralUnits'],
    });
  }

  async findOne(id: number, companyId: number): Promise<Condominium> {
    const condominium = await this.condominiumRepository.findOne({
      where: { id, companyId },
      relations: ['structuralUnits', 'structuralUnits.propertyUnits'],
    });

    if (!condominium) {
      throw new NotFoundException(`Condominium with ID ${id} not found`);
    }

    return condominium;
  }
}
