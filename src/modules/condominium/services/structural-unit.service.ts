import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Condominium } from '../entities/condominium.entity';
import { PropertyUnit } from '../entities/property-unit.entity';
import { StructuralUnit } from '../entities/structural-unit.entity';
import { CreateStructuralUnitDto } from '../dto/create-structural-unit.dto';
import { UpdateStructuralUnitDto } from '../dto/update-structural-unit.dto';

@Injectable()
export class StructuralUnitService {
  constructor(
    @InjectRepository(StructuralUnit)
    private readonly structuralUnitRepository: Repository<StructuralUnit>,
    @InjectRepository(Condominium)
    private readonly condominiumRepository: Repository<Condominium>,
    @InjectRepository(PropertyUnit)
    private readonly propertyUnitRepository: Repository<PropertyUnit>,
  ) {}

  async create(
    dto: CreateStructuralUnitDto,
    companyId: number,
  ): Promise<StructuralUnit> {
    await this.ensureCondominiumBelongsToCompany(dto.condominiumId, companyId);

    const createdId = await this.structuralUnitRepository.manager.transaction(
      async (manager) => {
        const structuralUnit = await manager.save(
          StructuralUnit,
          manager.create(StructuralUnit, {
            condominiumId: dto.condominiumId,
            name: dto.name,
            type: dto.type,
          }),
        );

        if (dto.propertyUnits?.length) {
          const propertyUnits = dto.propertyUnits.map((unit) =>
            manager.create(PropertyUnit, {
              ...unit,
              structuralUnitId: structuralUnit.id,
            }),
          );

          await manager.save(PropertyUnit, propertyUnits);
        }

        return structuralUnit.id;
      },
    );

    return await this.findOne(createdId, companyId);
  }

  async findByCondominium(
    condominiumId: number,
    companyId: number,
  ): Promise<StructuralUnit[]> {
    await this.ensureCondominiumBelongsToCompany(condominiumId, companyId);

    return await this.structuralUnitRepository.find({
      where: { condominiumId },
      relations: ['propertyUnits'],
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number, companyId: number): Promise<StructuralUnit> {
    const structuralUnit = await this.structuralUnitRepository.findOne({
      where: { id },
      relations: ['propertyUnits', 'condominium'],
    });

    if (!structuralUnit || structuralUnit.condominium.companyId !== companyId) {
      throw new NotFoundException(`Structural unit with ID ${id} not found`);
    }

    return structuralUnit;
  }

  async update(
    id: number,
    dto: UpdateStructuralUnitDto,
    companyId: number,
  ): Promise<StructuralUnit> {
    const structuralUnit = await this.findOne(id, companyId);

    if (dto.condominiumId) {
      await this.ensureCondominiumBelongsToCompany(
        dto.condominiumId,
        companyId,
      );
      structuralUnit.condominiumId = dto.condominiumId;
    }

    if (dto.name !== undefined) {
      structuralUnit.name = dto.name;
    }

    if (dto.type !== undefined) {
      structuralUnit.type = dto.type;
    }

    await this.structuralUnitRepository.manager.transaction(async (manager) => {
      await manager.save(StructuralUnit, structuralUnit);

      if (dto.propertyUnits?.length) {
        const newPropertyUnits = dto.propertyUnits.map((unit) =>
          manager.create(PropertyUnit, {
            ...unit,
            structuralUnitId: id,
          }),
        );

        await manager.save(PropertyUnit, newPropertyUnits);
      }
    });

    return await this.findOne(id, companyId);
  }

  async remove(id: number, companyId: number): Promise<void> {
    const structuralUnit = await this.findOne(id, companyId);
    await this.structuralUnitRepository.remove(structuralUnit);
  }

  async removePropertyUnit(
    propertyUnitId: number,
    companyId: number,
  ): Promise<void> {
    const propertyUnit = await this.propertyUnitRepository.findOne({
      where: { id: propertyUnitId },
      relations: ['structuralUnit', 'structuralUnit.condominium'],
    });

    if (
      !propertyUnit ||
      propertyUnit.structuralUnit.condominium.companyId !== companyId
    ) {
      throw new NotFoundException(
        `Property unit with ID ${propertyUnitId} not found`,
      );
    }

    await this.propertyUnitRepository.remove(propertyUnit);
  }

  private async ensureCondominiumBelongsToCompany(
    condominiumId: number,
    companyId: number,
  ): Promise<void> {
    const condominium = await this.condominiumRepository.findOne({
      where: { id: condominiumId, companyId },
    });

    if (!condominium) {
      throw new NotFoundException(
        `Condominium with ID ${condominiumId} not found`,
      );
    }
  }
}
