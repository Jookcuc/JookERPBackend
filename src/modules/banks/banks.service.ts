import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Bank } from './entities/bank.entity';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';
import { FilterBankDto } from './dto/filter-bank.dto';

@Injectable()
export class BanksService {
  constructor(
    @InjectRepository(Bank)
    private readonly bankRepo: Repository<Bank>,
  ) {}

  async create(dto: CreateBankDto, user: any): Promise<Bank> {
    const bank = this.bankRepo.create({
      ...dto,
      userId: user.id,
      companyId: user.companyId,
    });
    return this.bankRepo.save(bank);
  }

  async findAll(filters: FilterBankDto, user: any) {
    const { name } = filters;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 5;
    const skip = (page - 1) * limit;

    const where: any = { companyId: user.companyId };
    if (user.role === 2) where.userId = user.id;
    if (name) where.name = ILike(`%${name}%`);

    const [data, total] = await this.bankRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAllList(user: any): Promise<Array<Pick<Bank, 'id' | 'name'>>> {
    const where: any = { companyId: user.companyId };
    if (user.role === 2) where.userId = user.id;

    return this.bankRepo.find({
      where,
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number, user: any): Promise<Bank> {
    const bank = await this.bankRepo.findOne({
      where: { id, companyId: user.companyId },
    });
    if (!bank) throw new NotFoundException(`Banco con id ${id} no encontrado`);
    return bank;
  }

  async update(id: number, dto: UpdateBankDto, user: any): Promise<Bank> {
    const bank = await this.findOne(id, user);
    Object.assign(bank, dto);
    return this.bankRepo.save(bank);
  }

  async remove(id: number, user: any): Promise<{ message: string }> {
    const bank = await this.findOne(id, user);
    // TODO: Verify if it can be removed (if it has no transactions/invoices). For now, standard remove.
    await this.bankRepo.remove(bank);
    return { message: `Banco "${bank.name}" eliminado correctamente` };
  }
}
