import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Condominium } from '../entities/condominium.entity';
import { CreateCondominiumDto } from '../dto/create-condominium.dto';

@Injectable()
export class CondominiumService {
  constructor(
    @InjectRepository(Condominium)
    private readonly condominiumRepository: Repository<Condominium>,
  ) {}

  async create(createDto: CreateCondominiumDto, companyId: number): Promise<Condominium> {
    const condominium = this.condominiumRepository.create({
      ...createDto,
      companyId,
    });
    return await this.condominiumRepository.save(condominium);
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
