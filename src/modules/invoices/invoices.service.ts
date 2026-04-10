import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import PDFDocument from 'pdfkit';
import { ILike, In, Repository } from 'typeorm';
import { Product } from '../Inventory/entities/product.entity';
import {
  InventoryMovement,
  MovementType,
} from '../Inventory/entities/inventory-movement.entity';
import { Company } from '../company/entities/company.entity';
import { S3Service } from '../s3/s3.service';
import { TransactionsService } from '../transactions/transactions.service';
import { MovementType as TxMovementType } from '../transactions/entities/transaction.entity';
import { assertDateRange } from '../../common/utils/date-range.util';
import { CreateContactDto } from './dto/create-contact.dto';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { CreateSalesInvoiceDto } from './dto/create-sales-invoice.dto';
import { CalendarInvoiceFilterDto } from './dto/calendar-invoice-filter.dto';
import { FilterContactDto } from './dto/filter-contact.dto';
import { FilterInvoiceDto } from './dto/filter-invoice.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Contact, ContactType } from './entities/contact.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Invoice, InvoiceStatus, InvoiceType } from './entities/invoice.entity';

const PDF_COLORS = {
  brand: '0F766E',
  brandDark: '134E4A',
  accent: '5B7CFA',
  accentSoft: 'EEF2FF',
  ink: '0F172A',
  muted: '64748B',
  line: 'E2E8F0',
  card: 'F8FAFC',
  borderSoft: 'CBD5E1',
  success: 'DCFCE7',
  successText: '166534',
  pending: 'FEF3C7',
  pendingText: '92400E',
  danger: 'FEE2E2',
  dangerSoftText: '991B1B',
  warningText: '92400E',
  dangerText: '991B1B',
};

interface ExportFile {
  buffer: Buffer;
  contentType: string;
}

interface InvoicePdfLine {
  productId: number;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface InvoicePdfRow {
  productName: string;
  productCode: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
}

interface InvoicePdfColumn {
  key: keyof InvoicePdfRow;
  label: string;
  width: number;
  align: 'left' | 'center' | 'right';
}

interface InvoicePdfContext {
  companyName: string;
  generatedAt: Date;
  lines: InvoicePdfLine[];
  totalAmount: number;
}

interface InvoiceDetailRow {
  label: string;
  value: string;
  kind?: 'text' | 'status';
}

interface CalendarInvoiceRawRow {
  id: string;
  invoiceNumber: string;
  contactName: string | null;
  totalAmount: string | null;
  status: InvoiceStatus;
  invoiceType: InvoiceType;
  dueDate: string;
}

export interface CalendarInvoiceItem {
  id: number;
  invoiceNumber: string;
  contactName: string | null;
  totalAmount: number;
  status: InvoiceStatus;
  invoiceType: InvoiceType;
  dueDate: string;
}

export interface SalesInvoicePdfResponse {
  filename: string;
  format: 'pdf';
  key: string;
  fileUrl: string;
  downloadUrl: string;
  expiresAt: string;
  invoiceId: number;
  invoiceNumber: string;
}

interface ResolvedInvoiceItem {
  product: Product;
  productId: number;
  quantity: number;
  unitPrice: number;
}

interface PreparedInvoicePayload {
  invoiceType: InvoiceType;
  contactId: number;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  status?: InvoiceStatus;
  paymentConditions?: string;
  voucherUrl?: string;
  bankId?: number;
  items: ResolvedInvoiceItem[];
}

export type CalendarGroupedResponse = Record<string, CalendarInvoiceItem[]>;

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
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly transactionsService: TransactionsService,
    private readonly s3Service: S3Service,
  ) {}

  async createSales(dto: CreateSalesInvoiceDto, user: any): Promise<Invoice> {
    const prepared = await this.prepareSalesInvoice(dto, user);
    return this.createPreparedInvoice(prepared, user);
  }

  async createPurchase(
    dto: CreatePurchaseInvoiceDto,
    user: any,
  ): Promise<Invoice> {
    const prepared = await this.preparePurchaseInvoice(dto, user);
    return this.createPreparedInvoice(prepared, user);
  }

  private async createPreparedInvoice(
    dto: PreparedInvoicePayload,
    user: any,
  ): Promise<Invoice> {
    this.ensureDueDateAfterIssueDate(dto.issueDate, dto.dueDate);

    const exists = await this.invoiceRepo.findOne({
      where: {
        invoiceNumber: dto.invoiceNumber,
        companyId: user.companyId,
        invoiceType: dto.invoiceType,
      },
    });
    if (exists) {
      throw new ConflictException(
        `El numero de factura ${dto.invoiceNumber} ya existe para ${dto.invoiceType.toLowerCase()}`,
      );
    }

    const invoice = this.invoiceRepo.create({
      invoiceType: dto.invoiceType,
      contactId: dto.contactId,
      invoiceNumber: dto.invoiceNumber,
      issueDate: dto.issueDate,
      dueDate: dto.dueDate,
      totalAmount: dto.totalAmount,
      status: dto.status ?? InvoiceStatus.PENDIENTE,
      paymentConditions: dto.paymentConditions,
      voucherUrl: dto.voucherUrl,
      bankId: dto.bankId,
      userId: user.id,
      companyId: user.companyId,
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
      const product = item.product;

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
          movementType:
            dto.invoiceType === InvoiceType.VENTA
              ? MovementType.SALIDA_VENTA
              : MovementType.ENTRADA_COMPRA,
          quantity: item.quantity,
          relatedDocument: dto.invoiceNumber,
        }),
      );
    }

    const txType =
      dto.invoiceType === InvoiceType.VENTA
        ? TxMovementType.ENTRADA
        : TxMovementType.SALIDA;
    const txCategory =
      dto.invoiceType === InvoiceType.VENTA ? 'Venta' : 'Compra';
    await this.transactionsService.createFromInvoice(
      saved,
      user,
      txType,
      dto.totalAmount,
      dto.bankId,
      txCategory,
    );

    return this.findOne(saved.id, user);
  }

  private async prepareSalesInvoice(
    dto: CreateSalesInvoiceDto,
    user: any,
  ): Promise<PreparedInvoicePayload> {
    const contact = await this.findContactByType(
      dto.clientId,
      user.companyId,
      ContactType.CLIENTE,
      'cliente',
    );
    const items = await this.resolveInvoiceItems(
      dto.items,
      user.companyId,
      InvoiceType.VENTA,
    );

    return {
      invoiceType: InvoiceType.VENTA,
      contactId: contact.id,
      invoiceNumber: dto.invoiceNumber,
      issueDate: dto.issueDate,
      dueDate: dto.dueDate,
      totalAmount: dto.totalAmount,
      status: dto.status ?? InvoiceStatus.PENDIENTE,
      paymentConditions: dto.paymentConditions,
      bankId: dto.bankId,
      items,
    };
  }

  private async preparePurchaseInvoice(
    dto: CreatePurchaseInvoiceDto,
    user: any,
  ): Promise<PreparedInvoicePayload> {
    const contact = await this.findContactByType(
      dto.supplierId,
      user.companyId,
      ContactType.PROVEEDOR,
      'proveedor',
    );
    const items = await this.resolveInvoiceItems(
      dto.items,
      user.companyId,
      InvoiceType.COMPRA,
    );

    return {
      invoiceType: InvoiceType.COMPRA,
      contactId: contact.id,
      invoiceNumber: dto.invoiceNumber,
      issueDate: dto.issueDate,
      dueDate: dto.dueDate,
      totalAmount: dto.totalAmount,
      status: InvoiceStatus.PENDIENTE,
      paymentConditions: dto.paymentConditions,
      voucherUrl: dto.voucherUrl,
      items,
    };
  }

  private async findContactByType(
    id: number,
    companyId: number,
    expectedType: ContactType,
    label: string,
  ): Promise<Contact> {
    const contact = await this.contactRepo.findOne({
      where: { id, companyId, type: expectedType },
    });

    if (!contact) {
      throw new NotFoundException(
        `No se encontro un ${label} con id ${id} para esta compania`,
      );
    }

    return contact;
  }

  private async resolveInvoiceItems(
    items: Array<{ productId: number; quantity: number }>,
    companyId: number,
    invoiceType: InvoiceType,
  ): Promise<ResolvedInvoiceItem[]> {
    const productIds = [...new Set(items.map((item) => item.productId))];
    const requestedQuantities = items.reduce<Map<number, number>>(
      (acc, item) => {
        acc.set(item.productId, (acc.get(item.productId) ?? 0) + item.quantity);
        return acc;
      },
      new Map<number, number>(),
    );
    const products = await this.productRepo.find({
      where: { companyId, id: In(productIds) },
    });
    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );

    return items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(
          `Producto con id ${item.productId} no encontrado`,
        );
      }

      if (
        invoiceType === InvoiceType.VENTA &&
        Number(product.stock) < (requestedQuantities.get(item.productId) ?? 0)
      ) {
        throw new BadRequestException(
          `Stock insuficiente para "${product.name}". Disponible: ${product.stock}, solicitado: ${requestedQuantities.get(item.productId) ?? 0}`,
        );
      }

      return {
        product,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice:
          invoiceType === InvoiceType.VENTA
            ? Number(product.salePrice) || 0
            : Number(product.cost) || 0,
      };
    });
  }

  async findAll(filters: FilterInvoiceDto, user: any) {
    const {
      invoiceType,
      invoiceNumber,
      contactName,
      status,
      startDate,
      endDate,
    } = filters;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 5;
    const skip = (page - 1) * limit;

    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.contact', 'contact')
      .leftJoinAndSelect('inv.bank', 'bank')
      .leftJoinAndSelect('inv.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('inv.companyId = :companyId', { companyId: user.companyId })
      .orderBy('inv.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (user.role === 2) {
      qb.andWhere('inv.userId = :userId', { userId: user.id });
    }
    if (invoiceType) {
      qb.andWhere('inv.invoiceType = :invoiceType', { invoiceType });
    }
    if (invoiceNumber) {
      qb.andWhere('inv.invoiceNumber ILIKE :invoiceNumber', {
        invoiceNumber: `%${invoiceNumber}%`,
      });
    }
    if (contactName) {
      qb.andWhere('contact.name ILIKE :contactName', {
        contactName: `%${contactName}%`,
      });
    }
    if (status) {
      qb.andWhere('inv.status = :status', { status });
    }
    if (startDate) {
      qb.andWhere('inv.issueDate >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('inv.issueDate <= :endDate', { endDate });
    }

    const [data, total] = await qb.getManyAndCount();
    const dataWithDownloadUrl = await Promise.all(
      data.map(async (invoice) => {
        if (invoice.invoiceType !== InvoiceType.VENTA) {
          return invoice;
        }

        const pdf = await this.downloadSalesInvoicePdf(invoice.id, user);

        return {
          ...invoice,
          downloadUrl: pdf.downloadUrl,
          downloadUrlExpiresAt: pdf.expiresAt,
          pdfFileUrl: pdf.fileUrl,
          pdfFilename: pdf.filename,
          pdfKey: pdf.key,
        };
      }),
    );

    return {
      data: dataWithDownloadUrl,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, user: any): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, companyId: user.companyId },
      relations: ['contact', 'bank', 'items', 'items.product'],
    });
    if (!invoice) {
      throw new NotFoundException(`Factura con id ${id} no encontrada`);
    }
    return invoice;
  }

  async update(id: number, dto: UpdateInvoiceDto, user: any): Promise<Invoice> {
    const invoice = await this.findOne(id, user);

    if (dto.dueDate !== undefined) {
      this.ensureDueDateAfterIssueDate(invoice.issueDate, dto.dueDate);
    }

    Object.assign(invoice, dto);
    return this.invoiceRepo.save(invoice);
  }

  async remove(id: number, user: any): Promise<{ message: string }> {
    const invoice = await this.findOne(id, user);
    if (invoice.status === InvoiceStatus.PAGADA) {
      throw new BadRequestException(
        'No se puede eliminar una factura ya pagada',
      );
    }
    await this.invoiceRepo.remove(invoice);
    return {
      message: `Factura "${invoice.invoiceNumber}" eliminada correctamente`,
    };
  }

  async getCalendar(
    user: any,
    filters: CalendarInvoiceFilterDto,
  ): Promise<CalendarGroupedResponse> {
    const { invoiceType, startDate, endDate } = filters;
    assertDateRange(
      startDate,
      endDate,
      'startDate no puede ser mayor que endDate',
    );

    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .leftJoin('inv.contact', 'contact')
      .select('inv.id', 'id')
      .addSelect('inv.invoice_number', 'invoiceNumber')
      .addSelect('contact.name', 'contactName')
      .addSelect('inv.total_amount', 'totalAmount')
      .addSelect('inv.status', 'status')
      .addSelect('inv.invoice_type', 'invoiceType')
      .addSelect(`TO_CHAR(inv.due_date, 'YYYY-MM-DD')`, 'dueDate')
      .orderBy('inv.due_date', 'ASC')
      .addOrderBy('inv.id', 'ASC')
      .where('inv.company_id = :companyId', { companyId: user.companyId });

    if (user.role === 2) {
      qb.andWhere('inv.user_id = :userId', { userId: user.id });
    }
    if (invoiceType) {
      qb.andWhere('inv.invoice_type = :invoiceType', { invoiceType });
    }
    if (startDate) {
      qb.andWhere('inv.due_date >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('inv.due_date <= :endDate', { endDate });
    }

    const rows = await qb.getRawMany<CalendarInvoiceRawRow>();
    const grouped: CalendarGroupedResponse = {};

    for (const row of rows) {
      if (!grouped[row.dueDate]) {
        grouped[row.dueDate] = [];
      }
      grouped[row.dueDate].push({
        id: Number(row.id),
        invoiceNumber: row.invoiceNumber,
        contactName: row.contactName?.trim() || null,
        totalAmount: Number(row.totalAmount ?? 0),
        status: row.status,
        invoiceType: row.invoiceType,
        dueDate: row.dueDate,
      });
    }

    return grouped;
  }

  async createContact(dto: CreateContactDto, user: any): Promise<Contact> {
    const contact = new Contact();
    Object.assign(contact, {
      ...dto,
      userId: user.id,
      companyId: user.companyId,
    });
    return this.contactRepo.save(contact);
  }

  async findAllContacts(filters: FilterContactDto, user: any) {
    const { type, name } = filters;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 5;
    const skip = (page - 1) * limit;

    const where: any = { companyId: user.companyId };
    if (user.role === 2) {
      where.userId = user.id;
    }
    if (type) {
      where.type = type;
    }
    if (name) {
      where.name = ILike(`%${name}%`);
    }

    const [data, total] = await this.contactRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAllClientContactsList(
    user: any,
  ): Promise<Array<Pick<Contact, 'id' | 'name'>>> {
    return this.findContactsListByType(ContactType.CLIENTE, user);
  }

  async findAllSupplierContactsList(
    user: any,
  ): Promise<Array<Pick<Contact, 'id' | 'name'>>> {
    return this.findContactsListByType(ContactType.PROVEEDOR, user);
  }

  private async findContactsListByType(
    type: ContactType,
    user: any,
  ): Promise<Array<Pick<Contact, 'id' | 'name'>>> {
    const where: any = { companyId: user.companyId, type };
    if (user.role === 2) {
      where.userId = user.id;
    }

    return this.contactRepo.find({
      where,
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });
  }

  async updateContact(
    id: number,
    dto: UpdateContactDto,
    user: any,
  ): Promise<Contact> {
    const contact = await this.contactRepo.findOne({
      where: { id, companyId: user.companyId },
    });
    if (!contact) {
      throw new NotFoundException(`Contacto con id ${id} no encontrado`);
    }
    Object.assign(contact, dto);
    return this.contactRepo.save(contact);
  }

  async removeContact(id: number, user: any): Promise<{ message: string }> {
    const contact = await this.contactRepo.findOne({
      where: { id, companyId: user.companyId },
      relations: ['invoices'],
    });
    if (!contact) {
      throw new NotFoundException(`Contacto con id ${id} no encontrado`);
    }
    if (contact.invoices?.length > 0) {
      throw new ConflictException(
        `No se puede eliminar porque tiene ${contact.invoices.length} factura(s) asociada(s)`,
      );
    }
    await this.contactRepo.remove(contact);
    return { message: `Contacto "${contact.name}" eliminado correctamente` };
  }

  async downloadSalesInvoicePdf(
    id: number,
    user: any,
  ): Promise<SalesInvoicePdfResponse> {
    const invoice = await this.findOneWithPdfRelations(id, user.companyId);
    if (invoice.invoiceType !== InvoiceType.VENTA) {
      throw new BadRequestException(
        'Solo las facturas de venta se pueden descargar en PDF desde este endpoint',
      );
    }

    const generatedAt = new Date();
    const context = await this.buildInvoicePdfContext(
      invoice,
      user.companyId,
      generatedAt,
    );
    const filename = this.buildSalesInvoiceFilename(invoice, generatedAt);
    const key = this.buildSalesInvoiceKey(
      user.companyId,
      filename,
      generatedAt,
    );
    const exportFile = await this.generateSalesInvoicePdfBuffer(
      invoice,
      context,
    );

    const uploadedFile = await this.s3Service.uploadFile({
      key,
      body: exportFile.buffer,
      contentType: exportFile.contentType,
      contentDisposition: `attachment; filename="${filename}"`,
    });

    const { downloadUrl, expiresAt } = await this.s3Service.generateDownloadUrl(
      key,
      filename,
    );

    return {
      filename,
      format: 'pdf',
      key: uploadedFile.key,
      fileUrl: uploadedFile.fileUrl,
      downloadUrl,
      expiresAt,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
    };
  }

  private async findOneWithPdfRelations(
    id: number,
    companyId: number,
  ): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, companyId },
      relations: ['contact', 'items', 'items.product', 'bank'],
    });

    if (!invoice) {
      throw new NotFoundException(`Factura con id ${id} no encontrada`);
    }

    return invoice;
  }

  private async buildInvoicePdfContext(
    invoice: Invoice,
    companyId: number,
    generatedAt: Date,
  ): Promise<InvoicePdfContext> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });
    const lines = invoice.items.map((item) => ({
      productId: item.productId,
      productName: item.product?.name ?? `Producto ${item.productId}`,
      productCode: item.product?.code ?? `#${item.productId}`,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      subtotal: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    }));
    const calculatedTotal = lines.reduce((sum, line) => sum + line.subtotal, 0);

    return {
      companyName: company?.name?.trim() || `Compania ${companyId}`,
      generatedAt,
      lines,
      totalAmount: Number(invoice.totalAmount) || calculatedTotal,
    };
  }

  private buildSalesInvoiceFilename(
    invoice: Invoice,
    generatedAt: Date,
  ): string {
    const invoiceNumber = this.sanitizeFilenamePart(invoice.invoiceNumber);
    const timestamp = generatedAt.toISOString().replace(/[:.]/g, '-');
    return `sales-invoice-${invoiceNumber}-${timestamp}.pdf`;
  }

  private buildSalesInvoiceKey(
    companyId: number,
    filename: string,
    generatedAt: Date,
  ): string {
    const year = generatedAt.getUTCFullYear();
    const month = String(generatedAt.getUTCMonth() + 1).padStart(2, '0');
    return `exports/sales-invoices/company-${companyId}/${year}/${month}/${filename}`;
  }

  private sanitizeFilenamePart(value: string): string {
    const sanitized = value.trim().replace(/[^a-zA-Z0-9-_]+/g, '-');
    return sanitized || 'invoice';
  }

  private async generateSalesInvoicePdfBuffer(
    invoice: Invoice,
    context: InvoicePdfContext,
  ): Promise<ExportFile> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      bufferPages: true,
    });
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () =>
        resolve({
          buffer: Buffer.concat(chunks),
          contentType: 'application/pdf',
        }),
      );
      doc.on('error', reject);

      const rows = this.buildSalesInvoiceDetailRows(invoice, context);
      this.renderSalesInvoiceReferenceLayout(doc, invoice, context, rows);
      this.drawSalesInvoiceReferenceFooters(doc);

      doc.end();
    });
  }

  private buildSalesInvoiceDetailRows(
    invoice: Invoice,
    context: InvoicePdfContext,
  ): InvoiceDetailRow[] {
    const totalUnits = context.lines.reduce(
      (sum, line) => sum + line.quantity,
      0,
    );
    const rows: InvoiceDetailRow[] = [
      {
        label: 'Empresa',
        value: context.companyName,
      },
      {
        label: 'Cliente',
        value: invoice.contact?.name ?? 'Sin cliente',
      },
      {
        label: 'Cliente (ID)',
        value: String(invoice.contactId),
      },
      {
        label: 'Estado',
        value: invoice.status,
        kind: 'status',
      },
      {
        label: 'Fecha de emision',
        value: this.formatDate(invoice.issueDate),
      },
      {
        label: 'Fecha de vencimiento',
        value: this.formatDate(invoice.dueDate),
      },
      {
        label: 'Condiciones de pago',
        value: invoice.paymentConditions?.trim() || 'Sin condiciones',
      },
    ];

    context.lines.forEach((line, index) => {
      const suffix = context.lines.length > 1 ? ` ${index + 1}` : '';
      rows.push(
        {
          label: `Producto${suffix} (ID)`,
          value: String(line.productId),
        },
        {
          label: `Nombre producto${suffix}`,
          value: line.productName,
        },
        {
          label: `Cantidad${suffix}`,
          value: String(line.quantity),
        },
        {
          label: `Precio unitario${suffix}`,
          value: this.formatCurrency(line.unitPrice),
        },
        {
          label: `Subtotal${suffix}`,
          value: this.formatCurrency(line.subtotal),
        },
      );

      if (line.productCode && line.productCode !== `#${line.productId}`) {
        rows.splice(rows.length - 3, 0, {
          label: `Codigo${suffix}`,
          value: line.productCode,
        });
      }
    });

    rows.push(
      {
        label: 'Banco',
        value: invoice.bank?.name ?? 'Sin banco',
      },
      {
        label: 'Soporte',
        value: invoice.voucherUrl?.trim() || 'No registrado',
      },
      {
        label: 'Total productos',
        value: String(context.lines.length),
      },
      {
        label: 'Total unidades',
        value: String(totalUnits),
      },
      {
        label: 'Total factura',
        value: this.formatCurrency(context.totalAmount),
      },
    );

    return rows;
  }

  private renderSalesInvoiceReferenceLayout(
    doc: PDFKit.PDFDocument,
    invoice: Invoice,
    context: InvoicePdfContext,
    rows: InvoiceDetailRow[],
  ): void {
    let rowIndex = 0;
    let pageNumber = 1;

    do {
      if (pageNumber > 1) {
        doc.addPage();
      }

      const layout = this.drawSalesInvoiceReferenceCard(
        doc,
        invoice,
        context,
        pageNumber,
      );
      let y = layout.rowsStartY;

      while (rowIndex < rows.length) {
        const rowHeight = this.measureSalesInvoiceReferenceRowHeight(
          doc,
          layout.valueWidth,
          rows[rowIndex],
        );
        if (y + rowHeight > layout.rowsBottomY) {
          break;
        }

        y = this.drawSalesInvoiceReferenceRow(
          doc,
          layout.cardX + 30,
          layout.cardWidth - 60,
          layout.labelWidth,
          layout.valueWidth,
          y,
          rows[rowIndex],
        );
        rowIndex += 1;
      }

      this.drawSalesInvoiceBottomNotice(
        doc,
        layout.cardX,
        layout.cardY,
        layout.cardWidth,
        layout.cardHeight,
        pageNumber,
        rowIndex >= rows.length,
      );

      pageNumber += 1;
    } while (rowIndex < rows.length);
  }

  private drawSalesInvoiceReferenceCard(
    doc: PDFKit.PDFDocument,
    invoice: Invoice,
    context: InvoicePdfContext,
    pageNumber: number,
  ): {
    cardX: number;
    cardY: number;
    cardWidth: number;
    cardHeight: number;
    rowsStartY: number;
    rowsBottomY: number;
    labelWidth: number;
    valueWidth: number;
  } {
    const cardX = 10;
    const cardY = 10;
    const cardWidth = doc.page.width - 20;
    const cardHeight = doc.page.height - 20;
    const contentX = cardX + 30;
    const contentWidth = cardWidth - 60;
    const labelWidth = 200;
    const valueWidth = contentWidth - labelWidth;

    doc.save();
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 28).fill('#FBFCFE');
    doc.restore();

    doc.save();
    doc
      .roundedRect(cardX, cardY, cardWidth, cardHeight, 28)
      .dash(4, { space: 4 })
      .lineWidth(1)
      .stroke(`#${PDF_COLORS.borderSoft}`);
    doc.undash();
    doc.restore();

    doc
      .font('Helvetica-Bold')
      .fontSize(21)
      .fillColor(`#${PDF_COLORS.ink}`)
      .text('FACTURA DE VENTA', cardX + 20, cardY + 24, {
        width: cardWidth - 40,
        align: 'center',
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor(`#${PDF_COLORS.accent}`)
      .text(invoice.invoiceNumber, cardX + 20, cardY + 54, {
        width: cardWidth - 40,
        align: 'center',
      });

    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(`#${PDF_COLORS.muted}`)
      .text(
        pageNumber === 1
          ? context.companyName
          : `Continuacion de factura ${invoice.invoiceNumber}`,
        cardX + 20,
        cardY + 75,
        {
          width: cardWidth - 40,
          align: 'center',
        },
      );

    this.drawSalesInvoiceDashedSeparator(
      doc,
      contentX,
      contentX + contentWidth,
      cardY + 96,
    );

    return {
      cardX,
      cardY,
      cardWidth,
      cardHeight,
      rowsStartY: cardY + 112,
      rowsBottomY: cardY + cardHeight - 98,
      labelWidth,
      valueWidth,
    };
  }

  private measureSalesInvoiceReferenceRowHeight(
    doc: PDFKit.PDFDocument,
    valueWidth: number,
    row: InvoiceDetailRow,
  ): number {
    if (row.kind === 'status') {
      return 34;
    }

    const labelHeight = doc.heightOfString(row.label, {
      width: 190,
    });
    const valueHeight = doc.heightOfString(row.value, {
      width: valueWidth - 8,
      align: 'right',
    });

    return Math.max(28, Math.max(labelHeight, valueHeight) + 10);
  }

  private drawSalesInvoiceReferenceRow(
    doc: PDFKit.PDFDocument,
    x: number,
    width: number,
    labelWidth: number,
    valueWidth: number,
    y: number,
    row: InvoiceDetailRow,
  ): number {
    const rowHeight = this.measureSalesInvoiceReferenceRowHeight(
      doc,
      valueWidth,
      row,
    );
    const labelX = x;
    const valueX = x + labelWidth;

    doc
      .font('Helvetica')
      .fontSize(10.5)
      .fillColor('#94A3B8')
      .text(row.label, labelX, y + 8, {
        width: labelWidth - 12,
      });

    if (row.kind === 'status') {
      this.drawSalesInvoiceStatusChip(
        doc,
        valueX,
        y + 5,
        valueWidth,
        row.value,
      );
    } else {
      doc
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .fillColor(`#${PDF_COLORS.ink}`)
        .text(row.value, valueX, y + 8, {
          width: valueWidth,
          align: 'right',
        });
    }

    this.drawSalesInvoiceDashedSeparator(doc, x, x + width, y + rowHeight);
    return y + rowHeight;
  }

  private drawSalesInvoiceStatusChip(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    status: string,
  ): void {
    const tone = this.getSalesInvoiceStatusTone(status);
    doc.save();
    doc.font('Helvetica-Bold').fontSize(8.5);
    const chipWidth = Math.min(
      width,
      Math.max(doc.widthOfString(status) + 28, 70),
    );
    doc.restore();
    const chipX = x + width - chipWidth;

    doc.save();
    doc.roundedRect(chipX, y, chipWidth, 19, 9.5).fill(tone.fill);
    doc.restore();
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(tone.text)
      .text(status, chipX, y + 5.3, {
        width: chipWidth,
        align: 'center',
      });
  }

  private drawSalesInvoiceDashedSeparator(
    doc: PDFKit.PDFDocument,
    x1: number,
    x2: number,
    y: number,
  ): void {
    doc.save();
    doc
      .moveTo(x1, y)
      .lineTo(x2, y)
      .dash(1.5, { space: 2.5 })
      .strokeColor('#D7DEE8')
      .lineWidth(1)
      .stroke();
    doc.undash();
    doc.restore();
  }

  private drawSalesInvoiceBottomNotice(
    doc: PDFKit.PDFDocument,
    cardX: number,
    cardY: number,
    cardWidth: number,
    cardHeight: number,
    pageNumber: number,
    isLastPage: boolean,
  ): void {
    const noticeY = cardY + cardHeight - 72;
    const contentX = cardX + 30;
    const contentWidth = cardWidth - 60;

    this.drawSalesInvoiceDashedSeparator(
      doc,
      contentX,
      contentX + contentWidth,
      noticeY,
    );

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(`#${PDF_COLORS.dangerSoftText}`)
      .text('Documento no oficial', contentX, noticeY + 12);

    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(`#${PDF_COLORS.dangerSoftText}`)
      .text(
        isLastPage
          ? 'Este documento es informativo y no reemplaza la factura oficial. Exija su factura oficial al establecimiento.'
          : 'Este documento es informativo y continua en la siguiente pagina.',
        contentX,
        noticeY + 25,
        {
          width: contentWidth - 88,
        },
      );

    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(`#${PDF_COLORS.muted}`)
      .text(`Pagina ${pageNumber}`, contentX, noticeY + 12, {
        width: contentWidth,
        align: 'right',
      });
  }

  private drawSalesInvoiceReferenceFooters(doc: PDFKit.PDFDocument): void {
    const pageRange = doc.bufferedPageRange();

    for (let pageIndex = 0; pageIndex < pageRange.count; pageIndex += 1) {
      doc.switchToPage(pageIndex);
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#94A3B8')
        .text(
          `Jook ERP  |  Pagina ${pageIndex + 1} de ${pageRange.count}`,
          0,
          doc.page.height - 18,
          {
            width: doc.page.width,
            align: 'center',
          },
        );
    }
  }

  private getSalesInvoiceStatusTone(status: string): {
    fill: string;
    text: string;
  } {
    const normalized = status.trim().toUpperCase();

    if (normalized === InvoiceStatus.PAGADA) {
      return {
        fill: `#${PDF_COLORS.success}`,
        text: `#${PDF_COLORS.successText}`,
      };
    }

    if (
      normalized === InvoiceStatus.PENDIENTE ||
      normalized === InvoiceStatus.VENCIDA
    ) {
      return {
        fill: `#${PDF_COLORS.pending}`,
        text: `#${PDF_COLORS.pendingText}`,
      };
    }

    return {
      fill: `#${PDF_COLORS.danger}`,
      text: `#${PDF_COLORS.dangerText}`,
    };
  }

  private drawSalesInvoiceHeader(
    doc: PDFKit.PDFDocument,
    invoice: Invoice,
    context: InvoicePdfContext,
  ): number {
    doc.save();
    doc.rect(0, 0, doc.page.width, 112).fill(`#${PDF_COLORS.brandDark}`);
    doc
      .circle(doc.page.width - 48, 32, 52)
      .fillOpacity(0.07)
      .fill('#FFFFFF');
    doc
      .circle(doc.page.width - 86, 92, 34)
      .fillOpacity(0.07)
      .fill('#FFFFFF');
    doc.restore();

    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(24)
      .text(context.companyName, 40, 30, {
        width: doc.page.width - 240,
      });
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#CCFBF1')
      .text('Factura de venta generada desde Jook ERP', 40, 62);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#CCFBF1')
      .text(`Generada ${this.formatDateTime(context.generatedAt)}`, 40, 82);

    const cardX = doc.page.width - 212;
    const cardY = 24;
    const cardWidth = 152;
    const cardHeight = 66;
    doc.save();
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 14).fill('#FFFFFF');
    doc.restore();
    doc.save();
    doc
      .roundedRect(cardX, cardY, cardWidth, cardHeight, 14)
      .lineWidth(1)
      .stroke('#D5F5EF');
    doc.restore();

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(`#${PDF_COLORS.brandDark}`)
      .text('FACTURA', cardX + 16, cardY + 14, { width: cardWidth - 32 });
    doc
      .font('Helvetica-Bold')
      .fontSize(15)
      .fillColor(`#${PDF_COLORS.ink}`)
      .text(invoice.invoiceNumber, cardX + 16, cardY + 29, {
        width: cardWidth - 32,
      });
    this.drawHeaderBadge(
      doc,
      cardX + 16,
      cardY + 48,
      cardWidth - 32,
      invoice.status,
    );

    return 112;
  }

  private drawSalesInvoiceWarning(doc: PDFKit.PDFDocument, y: number): number {
    const height = 46;

    doc.save();
    doc.roundedRect(40, y, 515, height, 14).fill('#FEF3C7');
    doc.restore();
    doc.save();
    doc.roundedRect(40, y, 515, height, 14).lineWidth(1).stroke('#F59E0B');
    doc.restore();

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(`#${PDF_COLORS.warningText}`)
      .text('Documento no oficial', 56, y + 11);
    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor(`#${PDF_COLORS.warningText}`)
      .text(
        'Este PDF es informativo. No reemplaza la factura oficial ni sirve como soporte fiscal. Exija la factura oficial al establecimiento.',
        56,
        y + 24,
        { width: 484 },
      );

    return y + height;
  }

  private drawSalesInvoiceSummaryCards(
    doc: PDFKit.PDFDocument,
    invoice: Invoice,
    y: number,
  ): number {
    const gap = 11;
    const cardWidth = 120.5;
    const cardHeight = 62;
    const values = [
      { label: 'Emision', value: this.formatDate(invoice.issueDate) },
      { label: 'Vencimiento', value: this.formatDate(invoice.dueDate) },
      { label: 'Estado', value: invoice.status },
      { label: 'Banco', value: invoice.bank?.name ?? 'Sin banco' },
    ];

    values.forEach((entry, index) => {
      const x = 40 + index * (cardWidth + gap);
      doc.save();
      doc.roundedRect(x, y, cardWidth, cardHeight, 14).fill('#F8FAFC');
      doc.restore();
      doc.save();
      doc
        .roundedRect(x, y, cardWidth, cardHeight, 14)
        .lineWidth(1)
        .stroke('#E2E8F0');
      doc.restore();
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(`#${PDF_COLORS.muted}`)
        .text(entry.label.toUpperCase(), x + 14, y + 13, {
          width: cardWidth - 28,
        });
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(`#${PDF_COLORS.ink}`)
        .text(entry.value, x + 14, y + 30, {
          width: cardWidth - 28,
        });
    });

    return y + cardHeight;
  }

  private drawSalesInvoiceParties(
    doc: PDFKit.PDFDocument,
    invoice: Invoice,
    companyName: string,
    y: number,
  ): number {
    const gap = 15;
    const boxWidth = 250;
    const boxHeight = 98;

    this.drawInfoBox(doc, 40, y, boxWidth, boxHeight, 'Emisor', [
      companyName,
      'Documento generado desde el modulo de ventas',
      `Compania ID: ${invoice.companyId}`,
    ]);

    this.drawInfoBox(
      doc,
      40 + boxWidth + gap,
      y,
      boxWidth,
      boxHeight,
      'Cliente',
      [
        invoice.contact?.name ?? 'Sin cliente',
        invoice.contact?.email || 'Email no registrado',
        invoice.contact?.phone || 'Telefono no registrado',
        invoice.contact?.address || 'Direccion no registrada',
      ],
    );

    return y + boxHeight;
  }

  private drawInfoBox(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    lines: string[],
  ): void {
    doc.save();
    doc.roundedRect(x, y, width, height, 16).fill('#FFFFFF');
    doc.restore();
    doc.save();
    doc.roundedRect(x, y, width, height, 16).lineWidth(1).stroke('#E2E8F0');
    doc.restore();

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(`#${PDF_COLORS.brandDark}`)
      .text(title, x + 16, y + 14);

    let currentY = y + 34;
    lines.forEach((line, index) => {
      doc
        .font(index === 0 ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(index === 0 ? 11 : 9)
        .fillColor(index === 0 ? `#${PDF_COLORS.ink}` : `#${PDF_COLORS.muted}`)
        .text(line, x + 16, currentY, {
          width: width - 32,
        });
      currentY += index === 0 ? 17 : 13;
    });
  }

  private drawSalesInvoiceNotes(
    doc: PDFKit.PDFDocument,
    invoice: Invoice,
    context: InvoicePdfContext,
    y: number,
  ): number {
    const notes = [
      `Condiciones de pago: ${invoice.paymentConditions?.trim() || 'Sin condiciones registradas'}`,
      `Soporte adjunto: ${invoice.voucherUrl?.trim() || 'No registrado'}`,
      `Factura creada el ${this.formatDateTime(invoice.createdAt ?? context.generatedAt)}`,
    ].join('\n');
    const height =
      Math.max(
        60,
        doc.heightOfString(notes, {
          width: 515 - 28,
        }) + 28,
      ) + 6;

    doc.save();
    doc.roundedRect(40, y, 515, height, 16).fill('#F8FAFC');
    doc.restore();
    doc.save();
    doc.roundedRect(40, y, 515, height, 16).lineWidth(1).stroke('#E2E8F0');
    doc.restore();

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(`#${PDF_COLORS.brandDark}`)
      .text('Observaciones', 56, y + 14);
    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor(`#${PDF_COLORS.ink}`)
      .text(notes, 56, y + 31, {
        width: 487,
        lineGap: 2,
      });

    return y + height;
  }

  private drawSalesInvoiceTable(
    doc: PDFKit.PDFDocument,
    invoice: Invoice,
    lines: InvoicePdfLine[],
    startY: number,
  ): number {
    const columns: InvoicePdfColumn[] = [
      { key: 'productName', label: 'Producto', width: 225, align: 'left' },
      { key: 'productCode', label: 'Codigo', width: 70, align: 'left' },
      { key: 'quantity', label: 'Cant.', width: 55, align: 'center' },
      { key: 'unitPrice', label: 'Precio unit.', width: 82, align: 'right' },
      { key: 'subtotal', label: 'Subtotal', width: 83, align: 'right' },
    ];

    let y = startY;
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(`#${PDF_COLORS.ink}`)
      .text('Detalle de la factura', 40, y);
    y += 18;
    y = this.drawSalesInvoiceTableHeader(doc, columns, y);

    if (!lines.length) {
      const emptyHeight = 74;
      doc.save();
      doc.roundedRect(40, y, 515, emptyHeight, 16).fill('#FFFFFF');
      doc.restore();
      doc.save();
      doc
        .roundedRect(40, y, 515, emptyHeight, 16)
        .lineWidth(1)
        .stroke('#E2E8F0');
      doc.restore();
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(`#${PDF_COLORS.muted}`)
        .text('No hay productos registrados en esta factura', 40, y + 28, {
          width: 515,
          align: 'center',
        });
      return y + emptyHeight;
    }

    lines.forEach((line, index) => {
      const rowValues: InvoicePdfRow = {
        productName: line.productName,
        productCode: line.productCode,
        quantity: String(line.quantity),
        unitPrice: this.formatCurrency(line.unitPrice),
        subtotal: this.formatCurrency(line.subtotal),
      };
      const rowHeight = this.measureSalesInvoiceRowHeight(
        doc,
        columns,
        rowValues,
      );
      const bottomLimit = doc.page.height - doc.page.margins.bottom - 140;

      if (y + rowHeight > bottomLimit) {
        doc.addPage();
        y = this.drawSalesInvoiceContinuationHeader(doc, invoice);
        y = this.drawSalesInvoiceTableHeader(doc, columns, y);
      }

      y = this.drawSalesInvoiceTableRow(
        doc,
        columns,
        rowValues,
        y,
        rowHeight,
        index,
      );
    });

    return y;
  }

  private drawSalesInvoiceTableHeader(
    doc: PDFKit.PDFDocument,
    columns: InvoicePdfColumn[],
    y: number,
  ): number {
    let x = 40;
    const headerHeight = 28;

    columns.forEach((column) => {
      doc.save();
      doc.rect(x, y, column.width, headerHeight).fill(`#${PDF_COLORS.brand}`);
      doc.restore();
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#FFFFFF')
        .text(column.label, x + 8, y + 9, {
          width: column.width - 16,
          align: column.align,
        });
      x += column.width;
    });

    return y + headerHeight;
  }

  private measureSalesInvoiceRowHeight(
    doc: PDFKit.PDFDocument,
    columns: InvoicePdfColumn[],
    rowValues: InvoicePdfRow,
  ): number {
    let maxHeight = 30;

    columns.forEach((column) => {
      const text = rowValues[column.key] ?? '';
      const measuredHeight = doc.heightOfString(text, {
        width: column.width - 14,
        align: column.align,
      });
      maxHeight = Math.max(maxHeight, measuredHeight + 14);
    });

    return Math.max(maxHeight, 32);
  }

  private drawSalesInvoiceTableRow(
    doc: PDFKit.PDFDocument,
    columns: InvoicePdfColumn[],
    rowValues: InvoicePdfRow,
    y: number,
    rowHeight: number,
    index: number,
  ): number {
    let x = 40;

    doc.save();
    doc
      .rect(40, y, 515, rowHeight)
      .fill(index % 2 === 0 ? '#FFFFFF' : '#F8FAFC');
    doc.restore();

    columns.forEach((column) => {
      doc.save();
      doc.rect(x, y, column.width, rowHeight).lineWidth(0.6).stroke('#E2E8F0');
      doc.restore();
      doc
        .font(column.align === 'right' ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(8.8)
        .fillColor(`#${PDF_COLORS.ink}`)
        .text(rowValues[column.key] ?? '', x + 7, y + 8, {
          width: column.width - 14,
          align: column.align,
        });
      x += column.width;
    });

    return y + rowHeight;
  }

  private drawSalesInvoiceContinuationHeader(
    doc: PDFKit.PDFDocument,
    invoice: Invoice,
  ): number {
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(`#${PDF_COLORS.brandDark}`)
      .text(`Factura ${invoice.invoiceNumber}`, 40, 40);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(`#${PDF_COLORS.muted}`)
      .text('Continuacion del detalle de productos', 40, 62);

    return 94;
  }

  private drawSalesInvoiceTotals(
    doc: PDFKit.PDFDocument,
    invoice: Invoice,
    context: InvoicePdfContext,
    y: number,
  ): void {
    const sectionHeight = 100;
    const bottomLimit = doc.page.height - doc.page.margins.bottom - 40;

    if (y + sectionHeight > bottomLimit) {
      doc.addPage();
      y = this.drawSalesInvoiceContinuationHeader(doc, invoice);
    }

    const leftWidth = 290;
    const rightWidth = 210;
    const gap = 15;
    const quantity = context.lines.reduce(
      (sum, line) => sum + line.quantity,
      0,
    );

    doc.save();
    doc.roundedRect(40, y, leftWidth, sectionHeight, 16).fill('#FEE2E2');
    doc.restore();
    doc.save();
    doc
      .roundedRect(40, y, leftWidth, sectionHeight, 16)
      .lineWidth(1)
      .stroke('#FCA5A5');
    doc.restore();

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(`#${PDF_COLORS.dangerText}`)
      .text('Aviso importante', 56, y + 14);
    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor(`#${PDF_COLORS.dangerText}`)
      .text(
        'Esta impresion no constituye factura oficial. Sirve solo como representacion informativa de la venta registrada en el sistema.',
        56,
        y + 31,
        {
          width: leftWidth - 32,
        },
      );

    const totalsX = 40 + leftWidth + gap;
    doc.save();
    doc.roundedRect(totalsX, y, rightWidth, sectionHeight, 16).fill('#F8FAFC');
    doc.restore();
    doc.save();
    doc
      .roundedRect(totalsX, y, rightWidth, sectionHeight, 16)
      .lineWidth(1)
      .stroke('#E2E8F0');
    doc.restore();

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(`#${PDF_COLORS.brandDark}`)
      .text('Resumen', totalsX + 16, y + 14);

    this.drawTotalLine(
      doc,
      totalsX,
      y + 38,
      rightWidth,
      'Items',
      String(context.lines.length),
    );
    this.drawTotalLine(
      doc,
      totalsX,
      y + 55,
      rightWidth,
      'Unidades',
      String(quantity),
    );
    this.drawTotalLine(
      doc,
      totalsX,
      y + 74,
      rightWidth,
      'Total',
      this.formatCurrency(context.totalAmount),
      true,
    );
  }

  private drawTotalLine(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    label: string,
    value: string,
    highlight = false,
  ): void {
    doc
      .font(highlight ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(highlight ? 11 : 9.5)
      .fillColor(
        highlight ? `#${PDF_COLORS.brandDark}` : `#${PDF_COLORS.muted}`,
      )
      .text(label, x + 16, y, {
        width: 72,
      });
    doc
      .font('Helvetica-Bold')
      .fontSize(highlight ? 11 : 9.5)
      .fillColor(`#${PDF_COLORS.ink}`)
      .text(value, x + 90, y, {
        width: width - 106,
        align: 'right',
      });
  }

  private drawHeaderBadge(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    status: string,
  ): void {
    doc.save();
    doc.roundedRect(x, y, width, 16, 8).fill('#CCFBF1');
    doc.restore();
    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor(`#${PDF_COLORS.brandDark}`)
      .text(status, x + 4, y + 4.5, {
        width: width - 8,
        align: 'center',
      });
  }

  private drawSalesInvoiceFooters(doc: PDFKit.PDFDocument): void {
    const pageRange = doc.bufferedPageRange();

    for (let pageIndex = 0; pageIndex < pageRange.count; pageIndex += 1) {
      doc.switchToPage(pageIndex);
      const footerY = doc.page.height - 28;

      doc.save();
      doc
        .moveTo(40, footerY - 8)
        .lineTo(doc.page.width - 40, footerY - 8)
        .strokeColor('#E2E8F0')
        .lineWidth(1)
        .stroke();
      doc.restore();

      doc
        .font('Helvetica')
        .fontSize(8.3)
        .fillColor(`#${PDF_COLORS.muted}`)
        .text('Jook ERP', 40, footerY, {
          width: 80,
          align: 'left',
        });
      doc.text('Documento informativo no oficial', 40, footerY, {
        width: doc.page.width - 80,
        align: 'center',
      });
      doc.text(`Pagina ${pageIndex + 1} de ${pageRange.count}`, 40, footerY, {
        width: doc.page.width - 80,
        align: 'right',
      });
    }
  }

  private formatDate(value: Date | string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeZone: 'America/Bogota',
    }).format(date);
  }

  private formatDateTime(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Bogota',
    }).format(date);
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  }

  private ensureDueDateAfterIssueDate(
    issueDate: string | Date,
    dueDate: string | Date,
  ): void {
    assertDateRange(
      issueDate,
      dueDate,
      'La fecha de vencimiento debe ser mayor a la fecha de emision',
      { allowEqual: false },
    );
  }
}
