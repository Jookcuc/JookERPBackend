import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dtos/create-company.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async create(dto: CreateCompanyDto): Promise<Company> {
    const company = this.companyRepo.create(dto);
    return this.companyRepo.save(company);
  }

  async findAll() {
    return this.companyRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Company> {
    const company = await this.companyRepo.findOne({ where: { id } });
    if (!company) throw new NotFoundException(`Empresa con id ${id} no encontrada`);
    return company;
  }

  async update(id: number, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);
    Object.assign(company, dto);
    return this.companyRepo.save(company);
  }

  async remove(id: number): Promise<{ message: string }> {
    const company = await this.findOne(id);
    await this.companyRepo.remove(company);
    return { message: `Empresa "${company.name}" eliminada correctamente` };
  }
}