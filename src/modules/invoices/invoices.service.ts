import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Invoice, InvoiceType, InvoiceStatus } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Contact } from './entities/contact.entity';
import { Product } from '../Inventory/entities/product.entity';
import { InventoryMovement, MovementType } from '../Inventory/entities/inventory-movement.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { FilterInvoiceDto } from './dto/filter-invoice.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { FilterContactDto } from './dto/filter-contact.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly itemRepo: Repository<InvoiceItem>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepo: Repository<InventoryMovement>,
  ) { }

  // ─── FACTURAS ────────────────────────────────────────────────

  async create(dto: CreateInvoiceDto, user: any): Promise<Invoice> {
    const exists = await this.invoiceRepo.findOne({
      where: { invoiceNumber: dto.invoiceNumber, companyId: user.companyId },
    });
    if (exists) throw new ConflictException(`El número de factura ${dto.invoiceNumber} ya existe`);

    const contact = await this.contactRepo.findOne({
      where: { id: dto.contactId, companyId: user.companyId },
    });
    if (!contact) throw new NotFoundException(`Contacto con id ${dto.contactId} no encontrado`);

    let totalAmount = 0;
    for (const item of dto.items) {
      const product = await this.productRepo.findOne({
        where: { id: item.productId, companyId: user.companyId },
      });
      if (!product) continue;

      if (dto.invoiceType === InvoiceType.VENTA && product.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para "${product.name}". Disponible: ${product.stock}, solicitado: ${item.quantity}`
        );
      }
      totalAmount += item.quantity * item.unitPrice;
    }

    const invoice = this.invoiceRepo.create({
      ...dto,
      userId: user.id,
      companyId: user.companyId,
      totalAmount,
      items: dto.items.map((item) =>
        this.itemRepo.create({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }),
      ),
    });

    const saved = await this.invoiceRepo.save(invoice);

    for (const item of dto.items) {
      const product = await this.productRepo.findOne({ where: { id: item.productId } });
      if (!product) continue;

      if (dto.invoiceType === InvoiceType.VENTA) {
        product.stock -= item.quantity;
      } else {
        product.stock += item.quantity;
      }

      await this.productRepo.save(product);

      await this.movementRepo.save(
        this.movementRepo.create({
          productId: item.productId,
          userId: user.id,
          companyId: user.companyId,
          movementType: dto.invoiceType === InvoiceType.VENTA
            ? MovementType.SALIDA_VENTA
            : MovementType.ENTRADA_COMPRA,
          quantity: item.quantity,
          relatedDocument: dto.invoiceNumber,
        }),
      );
    }

    return saved;
  }

  async findAll(filters: FilterInvoiceDto, user: any) {
    const { invoiceType, invoiceNumber, contactName, status, startDate, endDate } = filters;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 5;
    const skip = (page - 1) * limit;

    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.contact', 'contact')
      .leftJoinAndSelect('inv.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('inv.companyId = :companyId', { companyId: user.companyId })
      .orderBy('inv.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (user.role === 2) qb.andWhere('inv.userId = :userId', { userId: user.id });
    if (invoiceType) qb.andWhere('inv.invoiceType = :invoiceType', { invoiceType });
    if (invoiceNumber) qb.andWhere('inv.invoiceNumber ILIKE :invoiceNumber', { invoiceNumber: `%${invoiceNumber}%` });
    if (contactName) qb.andWhere('contact.name ILIKE :contactName', { contactName: `%${contactName}%` });
    if (status) qb.andWhere('inv.status = :status', { status });
    if (startDate) qb.andWhere('inv.issueDate >= :startDate', { startDate });
    if (endDate) qb.andWhere('inv.issueDate <= :endDate', { endDate });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number, user: any): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, companyId: user.companyId },
      relations: ['contact', 'items', 'items.product'],
    });
    if (!invoice) throw new NotFoundException(`Factura con id ${id} no encontrada`);
    return invoice;
  }

  async update(id: number, dto: UpdateInvoiceDto, user: any): Promise<Invoice> {
    const invoice = await this.findOne(id, user);
    Object.assign(invoice, dto);
    return this.invoiceRepo.save(invoice);
  }

  async remove(id: number, user: any): Promise<{ message: string }> {
    const invoice = await this.findOne(id, user);
    if (invoice.status === InvoiceStatus.PAGADA) {
      throw new BadRequestException('No se puede eliminar una factura ya pagada');
    }
    await this.invoiceRepo.remove(invoice);
    return { message: `Factura "${invoice.invoiceNumber}" eliminada correctamente` };
  }

  async getCalendar(user: any, invoiceType?: InvoiceType, startDate?: string, endDate?: string) {
    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.contact', 'contact')
      .orderBy('inv.due_date', 'ASC')
      .andWhere('inv.company_id = :companyId', { companyId: user.companyId });

    if (user.role === 2) qb.andWhere('inv.user_id = :userId', { userId: user.id });
    if (invoiceType) qb.andWhere('inv.invoice_type = :invoiceType', { invoiceType });
    if (startDate) qb.andWhere('inv.due_date >= :startDate', { startDate });
    if (endDate) qb.andWhere('inv.due_date <= :endDate', { endDate });

    const invoices = await qb.getMany();

    const grouped: Record<string, any[]> = {};
    for (const inv of invoices) {
      const dateKey = inv.dueDate.toString().split('T')[0];
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        contactName: inv.contact?.name,
        totalAmount: inv.totalAmount,
        status: inv.status,
        invoiceType: inv.invoiceType,
        dueDate: inv.dueDate,
      });
    }

    return grouped;
  }

  // ─── CONTACTOS ───────────────────────────────────────────────

  async createContact(dto: CreateContactDto, user: any): Promise<Contact> {
    const contact = new Contact();  // ← cambiar esto
    Object.assign(contact, { ...dto, userId: user.id, companyId: user.companyId });
    return this.contactRepo.save(contact);
  }

  async findAllContacts(filters: FilterContactDto, user: any) {
    const { type, name } = filters;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 5;
    const skip = (page - 1) * limit;

    const where: any = { companyId: user.companyId };
    if (user.role === 2) where.userId = user.id;
    if (type) where.type = type;
    if (name) where.name = ILike(`%${name}%`);

    const [data, total] = await this.contactRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateContact(id: number, dto: UpdateContactDto, user: any): Promise<Contact> {
    const contact = await this.contactRepo.findOne({ where: { id, companyId: user.companyId } });
    if (!contact) throw new NotFoundException(`Contacto con id ${id} no encontrado`);
    Object.assign(contact, dto);
    return this.contactRepo.save(contact);
  }

  async removeContact(id: number, user: any): Promise<{ message: string }> {
    const contact = await this.contactRepo.findOne({
      where: { id, companyId: user.companyId },
      relations: ['invoices'],
    });
    if (!contact) throw new NotFoundException(`Contacto con id ${id} no encontrado`);
    if (contact.invoices?.length > 0) {
      throw new ConflictException(
        `No se puede eliminar porque tiene ${contact.invoices.length} factura(s) asociada(s)`
      );
    }
    await this.contactRepo.remove(contact);
    return { message: `Contacto "${contact.name}" eliminado correctamente` };
  }
}