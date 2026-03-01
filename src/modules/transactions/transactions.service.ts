import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, MovementType } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async createAdjustment(dto: CreateTransactionDto, user: any): Promise<Transaction> {
    if (dto.movement !== MovementType.AJUSTE) {
      throw new BadRequestException('Solo se pueden crear transacciones manuales de tipo Ajuste');
    }

    const transaction = this.transactionRepo.create({
      ...dto,
      movement: dto.movement as MovementType,
      companyId: user.companyId,
      status: 'Completada', // Ajustes go directly to completed
    });

    return this.transactionRepo.save(transaction);
  }

  async findAll(filters: FilterTransactionDto, user: any) {
    const { category, movement, startDate, endDate } = filters;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 5;
    const skip = (page - 1) * limit;

    const qb = this.transactionRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.bank', 'bank')
      .where('tx.companyId = :companyId', { companyId: user.companyId });

    if (category) qb.andWhere('tx.category = :category', { category });
    if (movement) qb.andWhere('tx.movement = :movement', { movement });
    if (startDate) qb.andWhere('tx.date >= :startDate', { startDate });
    if (endDate) qb.andWhere('tx.date <= :endDate', { endDate });

    qb.orderBy('tx.createdAt', 'DESC');

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    // Summing for stats, without skip and limit
    const statsQb = this.transactionRepo.createQueryBuilder('tx')
      .where('tx.companyId = :companyId', { companyId: user.companyId });

    if (category) statsQb.andWhere('tx.category = :category', { category });
    if (movement) statsQb.andWhere('tx.movement = :movement', { movement });
    if (startDate) statsQb.andWhere('tx.date >= :startDate', { startDate });
    if (endDate) statsQb.andWhere('tx.date <= :endDate', { endDate });

    const allRecords = await statsQb.getMany();
    let ingresos = 0;
    let egresos = 0;
    
    for (const record of allRecords) {
      const amt = Number(record.amount) || 0;
      if (record.movement === MovementType.ENTRADA) {
        ingresos += amt;
      } else if (record.movement === MovementType.SALIDA) {
        egresos += Math.abs(amt);
      } else if (record.movement === MovementType.AJUSTE) {
        if (amt >= 0) ingresos += amt;
        else egresos += Math.abs(amt);
      }
    }
    
    const balanceTotal = ingresos - egresos;

    return { 
      data, 
      total, 
      page, 
      limit, 
      totalPages: Math.ceil(total / limit),
      stats: {
        ingresos,
        egresos,
        balanceTotal,
      },
    };
  }

  // Helper used by Invoices service
  async createFromInvoice(invoice: any, user: any, type: MovementType, amount: number, bankId?: number, category: string = 'Venta'): Promise<Transaction> {
    const transaction = this.transactionRepo.create({
      companyId: user.companyId,
      invoiceId: invoice.id,
      bankId: bankId,
      reference: invoice.invoiceNumber,
      category: category,
      status: 'Completada',
      amount: type === MovementType.SALIDA ? -Math.abs(amount) : Math.abs(amount),
      method: 'Facturacion',
      description: `Generado por factura ${invoice.invoiceNumber}`,
      movement: type,
      date: new Date(),
    });

    return this.transactionRepo.save(transaction);
  }
}
