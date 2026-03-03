import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { SelectQueryBuilder, Repository } from 'typeorm';
import { S3Service } from '../s3/s3.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ExportTransactionsDto } from './dto/export-transactions.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import { MovementType, Transaction } from './entities/transaction.entity';

const BRAND_COLORS = {
  brand: '0F766E',
  brandDark: '134E4A',
  brandSoft: 'CCFBF1',
  ink: '0F172A',
  muted: '64748B',
  white: 'FFFFFF',
  line: 'E2E8F0',
  surface: 'F8FAFC',
  positive: 'DCFCE7',
  positiveText: '166534',
  negative: 'FEE2E2',
  negativeText: '991B1B',
  warning: 'FEF3C7',
  warningText: '92400E',
};

interface ExportFile {
  buffer: Buffer;
  contentType: string;
}

interface FilterSubset {
  category?: string;
  movement?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuthenticatedUser {
  companyId: number;
}

interface InvoiceSource {
  id: number;
  invoiceNumber: string;
}

interface SelectOption {
  label: string;
  value: string;
}

export interface TransactionStats {
  ingresos: number;
  egresos: number;
  balanceTotal: number;
}

export interface TransactionListResponse {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: TransactionStats;
}

export interface TransactionExportResponse {
  filename: string;
  format: 'excel' | 'pdf';
  key: string;
  fileUrl: string;
  downloadUrl: string;
  expiresAt: string;
  totalRecords: number;
  stats: TransactionStats;
}

export interface TransactionFilterOptionsResponse {
  movements: SelectOption[];
  categories: SelectOption[];
  formats: SelectOption[];
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly s3Service: S3Service,
  ) {}

  async createAdjustment(
    dto: CreateTransactionDto,
    user: AuthenticatedUser,
  ): Promise<Transaction> {
    if (dto.movement !== MovementType.AJUSTE) {
      throw new BadRequestException(
        'Solo se pueden crear transacciones manuales de tipo Ajuste',
      );
    }

    const transaction = this.transactionRepo.create({
      ...dto,
      movement: dto.movement,
      companyId: user.companyId,
      status: 'Completada', // Ajustes go directly to completed
    });

    return this.transactionRepo.save(transaction);
  }

  async findAll(
    filters: FilterTransactionDto,
    user: AuthenticatedUser,
  ): Promise<TransactionListResponse> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 5;
    const skip = (page - 1) * limit;

    const filteredQuery = this.buildFilteredQuery(filters, user.companyId);
    const [data, total] = await filteredQuery
      .clone()
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    const allRecords = await filteredQuery.getMany();
    const stats = this.calculateStats(allRecords);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats,
    };
  }

  async getFilterOptions(
    user: AuthenticatedUser,
  ): Promise<TransactionFilterOptionsResponse> {
    const categories = await this.transactionRepo
      .createQueryBuilder('tx')
      .select('DISTINCT tx.category', 'category')
      .where('tx.companyId = :companyId', { companyId: user.companyId })
      .andWhere('tx.category IS NOT NULL')
      .andWhere("TRIM(tx.category) <> ''")
      .orderBy('tx.category', 'ASC')
      .getRawMany<{ category: string }>();

    return {
      movements: this.buildMovementOptions(),
      categories: categories
        .map(({ category }) => ({
          label: category,
          value: category,
        }))
        .sort((left, right) =>
          left.label.localeCompare(right.label, 'es', { sensitivity: 'base' }),
        ),
      formats: [
        { label: 'Excel (.xlsx)', value: 'excel' },
        { label: 'PDF (.pdf)', value: 'pdf' },
      ],
    };
  }

  async exportTransactions(
    filters: ExportTransactionsDto,
    user: AuthenticatedUser,
  ): Promise<TransactionExportResponse> {
    const format = this.normalizeExportFormat(filters.format);
    const transactions = await this.buildFilteredQuery(
      filters,
      user.companyId,
    ).getMany();
    const stats = this.calculateStats(transactions);
    const exportedAt = new Date();
    const filename = this.buildExportFilename(
      format,
      user.companyId,
      exportedAt,
    );
    const key = this.buildExportKey(user.companyId, filename, exportedAt);

    const exportFile =
      format === 'pdf'
        ? await this.generatePdfBuffer(transactions, stats, filters, exportedAt)
        : await this.generateExcelBuffer(
            transactions,
            stats,
            filters,
            exportedAt,
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
      format,
      key: uploadedFile.key,
      fileUrl: uploadedFile.fileUrl,
      downloadUrl,
      expiresAt,
      totalRecords: transactions.length,
      stats,
    };
  }

  // Helper used by Invoices service
  async createFromInvoice(
    invoice: InvoiceSource,
    user: AuthenticatedUser,
    type: MovementType,
    amount: number,
    bankId?: number,
    category: string = 'Venta',
  ): Promise<Transaction> {
    const transaction = this.transactionRepo.create({
      companyId: user.companyId,
      invoiceId: invoice.id,
      bankId: bankId,
      reference: invoice.invoiceNumber,
      category: category,
      status: 'Completada',
      amount:
        type === MovementType.SALIDA ? -Math.abs(amount) : Math.abs(amount),
      method: 'Facturacion',
      description: `Generado por factura ${invoice.invoiceNumber}`,
      movement: type,
      date: new Date(),
    });

    return this.transactionRepo.save(transaction);
  }

  private buildFilteredQuery(
    filters: FilterSubset,
    companyId: number,
  ): SelectQueryBuilder<Transaction> {
    const { category, movement, startDate, endDate } = filters;

    const qb = this.transactionRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.bank', 'bank')
      .where('tx.companyId = :companyId', { companyId });

    if (category) qb.andWhere('tx.category = :category', { category });
    if (movement) qb.andWhere('tx.movement = :movement', { movement });
    if (startDate) qb.andWhere('tx.date >= :startDate', { startDate });
    if (endDate) qb.andWhere('tx.date <= :endDate', { endDate });

    return qb.orderBy('tx.createdAt', 'DESC');
  }

  private buildMovementOptions(): SelectOption[] {
    return Object.values(MovementType).map((movement) => ({
      label: movement,
      value: movement,
    }));
  }

  private calculateStats(records: Transaction[]): TransactionStats {
    let ingresos = 0;
    let egresos = 0;

    for (const record of records) {
      const amount = Number(record.amount) || 0;

      if (record.movement === MovementType.ENTRADA) {
        ingresos += amount;
        continue;
      }

      if (record.movement === MovementType.SALIDA) {
        egresos += Math.abs(amount);
        continue;
      }

      if (amount >= 0) ingresos += amount;
      else egresos += Math.abs(amount);
    }

    return {
      ingresos,
      egresos,
      balanceTotal: ingresos - egresos,
    };
  }

  private normalizeExportFormat(
    format: ExportTransactionsDto['format'],
  ): 'excel' | 'pdf' {
    if (!format || format === 'excel' || format === 'xlsx') {
      return 'excel';
    }

    return 'pdf';
  }

  private buildExportFilename(
    format: 'excel' | 'pdf',
    companyId: number,
    exportedAt: Date,
  ): string {
    const extension = format === 'pdf' ? 'pdf' : 'xlsx';
    const timestamp = exportedAt.toISOString().replace(/[:.]/g, '-');

    return `transactions-company-${companyId}-${timestamp}.${extension}`;
  }

  private buildExportKey(
    companyId: number,
    filename: string,
    exportedAt: Date,
  ): string {
    const year = exportedAt.getUTCFullYear();
    const month = String(exportedAt.getUTCMonth() + 1).padStart(2, '0');

    return `exports/transactions/company-${companyId}/${year}/${month}/${filename}`;
  }

  private async generateExcelBuffer(
    transactions: Transaction[],
    stats: TransactionStats,
    filters: FilterSubset,
    exportedAt: Date,
  ): Promise<ExportFile> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Jook ERP';
    workbook.created = exportedAt;
    workbook.modified = exportedAt;
    workbook.subject = 'Exportacion de transacciones';
    workbook.title = 'Reporte de transacciones';

    const summarySheet = workbook.addWorksheet('Resumen', {
      properties: { defaultRowHeight: 20 },
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
      },
      views: [{ showGridLines: false }],
    });
    const transactionsSheet = workbook.addWorksheet('Transacciones', {
      properties: { defaultRowHeight: 20 },
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
      views: [{ state: 'frozen', ySplit: 7 }],
    });

    this.buildExcelSummarySheet(
      summarySheet,
      transactions,
      stats,
      filters,
      exportedAt,
    );
    this.buildExcelTransactionsSheet(
      transactionsSheet,
      transactions,
      stats,
      filters,
      exportedAt,
    );

    const rawBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.isBuffer(rawBuffer)
      ? rawBuffer
      : Buffer.from(rawBuffer);

    return {
      buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private buildExcelSummarySheet(
    sheet: ExcelJS.Worksheet,
    transactions: Transaction[],
    stats: TransactionStats,
    filters: FilterSubset,
    exportedAt: Date,
  ): void {
    sheet.columns = Array.from({ length: 12 }, () => ({ width: 16 }));

    sheet.mergeCells('A1:L2');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Reporte de Transacciones';
    titleCell.font = {
      name: 'Calibri',
      size: 22,
      bold: true,
      color: { argb: BRAND_COLORS.white },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: BRAND_COLORS.brandDark },
    };

    sheet.mergeCells('A3:L3');
    const subtitleCell = sheet.getCell('A3');
    subtitleCell.value = `Generado ${this.formatDateTime(exportedAt)}  |  ${transactions.length} transacciones`;
    subtitleCell.font = {
      name: 'Calibri',
      size: 11,
      color: { argb: BRAND_COLORS.muted },
    };
    subtitleCell.alignment = { horizontal: 'center' };

    this.paintExcelMetricCard(
      sheet,
      'A5:C7',
      'Ingresos',
      this.formatAmount(stats.ingresos),
      BRAND_COLORS.positive,
      BRAND_COLORS.positiveText,
    );
    this.paintExcelMetricCard(
      sheet,
      'D5:F7',
      'Egresos',
      this.formatAmount(stats.egresos),
      BRAND_COLORS.negative,
      BRAND_COLORS.negativeText,
    );
    this.paintExcelMetricCard(
      sheet,
      'G5:I7',
      'Balance',
      this.formatAmount(stats.balanceTotal),
      BRAND_COLORS.brandSoft,
      BRAND_COLORS.brandDark,
    );
    this.paintExcelMetricCard(
      sheet,
      'J5:L7',
      'Registros',
      String(transactions.length),
      BRAND_COLORS.surface,
      BRAND_COLORS.ink,
    );

    sheet.mergeCells('A10:L10');
    const filterTitle = sheet.getCell('A10');
    filterTitle.value = 'Filtros aplicados';
    filterTitle.font = {
      name: 'Calibri',
      size: 13,
      bold: true,
      color: { argb: BRAND_COLORS.brandDark },
    };

    const filterRows = [
      ['Formato', 'Excel (.xlsx)'],
      ['Movimiento', filters.movement ?? 'Todos'],
      ['Categoria', filters.category ?? 'Todas'],
      ['Fecha inicial', filters.startDate ?? 'Sin filtro'],
      ['Fecha final', filters.endDate ?? 'Sin filtro'],
    ];

    filterRows.forEach(([label, value], index) => {
      const rowNumber = 11 + index;
      sheet.mergeCells(`A${rowNumber}:C${rowNumber}`);
      sheet.mergeCells(`D${rowNumber}:L${rowNumber}`);

      const labelCell = sheet.getCell(`A${rowNumber}`);
      labelCell.value = label;
      labelCell.font = { bold: true, color: { argb: BRAND_COLORS.ink } };
      labelCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: BRAND_COLORS.surface },
      };
      labelCell.border = this.getExcelBorder();

      const valueCell = sheet.getCell(`D${rowNumber}`);
      valueCell.value = value;
      valueCell.font = { color: { argb: BRAND_COLORS.ink } };
      valueCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: BRAND_COLORS.white },
      };
      valueCell.border = this.getExcelBorder();
    });

    sheet.mergeCells('A18:L21');
    const noteCell = sheet.getCell('A18');
    noteCell.value =
      'Este archivo contiene un resumen ejecutivo y una hoja de detalle lista para filtros, auditoria y conciliacion. La hoja "Transacciones" deja el encabezado fijo y aplica formato visual por tipo de movimiento.';
    noteCell.alignment = {
      wrapText: true,
      vertical: 'middle',
      horizontal: 'left',
    };
    noteCell.font = {
      name: 'Calibri',
      size: 11,
      color: { argb: BRAND_COLORS.muted },
    };
    noteCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F1F5F9' },
    };
    noteCell.border = this.getExcelBorder();
  }

  private buildExcelTransactionsSheet(
    sheet: ExcelJS.Worksheet,
    transactions: Transaction[],
    stats: TransactionStats,
    filters: FilterSubset,
    exportedAt: Date,
  ): void {
    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Fecha', key: 'date', width: 14 },
      { header: 'Referencia', key: 'reference', width: 22 },
      { header: 'Movimiento', key: 'movement', width: 16 },
      { header: 'Categoria', key: 'category', width: 20 },
      { header: 'Banco', key: 'bank', width: 20 },
      { header: 'Metodo', key: 'method', width: 18 },
      { header: 'Estado', key: 'status', width: 16 },
      { header: 'Monto', key: 'amount', width: 16 },
      { header: 'Factura', key: 'invoiceId', width: 12 },
      { header: 'Descripcion', key: 'description', width: 40 },
      { header: 'Creada', key: 'createdAt', width: 22 },
    ];

    sheet.mergeCells('A1:L2');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Detalle de transacciones';
    titleCell.font = {
      size: 20,
      bold: true,
      color: { argb: BRAND_COLORS.white },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: BRAND_COLORS.brand },
    };

    sheet.mergeCells('A3:L3');
    const metaCell = sheet.getCell('A3');
    metaCell.value = `Exportado ${this.formatDateTime(exportedAt)}  |  Movimiento: ${filters.movement ?? 'Todos'}  |  Categoria: ${filters.category ?? 'Todas'}  |  Periodo: ${filters.startDate ?? 'Sin inicio'} a ${filters.endDate ?? 'Sin fin'}`;
    metaCell.font = { size: 11, color: { argb: BRAND_COLORS.muted } };

    sheet.mergeCells('A5:C5');
    sheet.mergeCells('D5:F5');
    sheet.mergeCells('G5:I5');
    sheet.mergeCells('J5:L5');
    this.paintExcelInlineMetric(
      sheet.getCell('A5'),
      `Ingresos  ${this.formatAmount(stats.ingresos)}`,
      BRAND_COLORS.positive,
      BRAND_COLORS.positiveText,
    );
    this.paintExcelInlineMetric(
      sheet.getCell('D5'),
      `Egresos  ${this.formatAmount(stats.egresos)}`,
      BRAND_COLORS.negative,
      BRAND_COLORS.negativeText,
    );
    this.paintExcelInlineMetric(
      sheet.getCell('G5'),
      `Balance  ${this.formatAmount(stats.balanceTotal)}`,
      BRAND_COLORS.brandSoft,
      BRAND_COLORS.brandDark,
    );
    this.paintExcelInlineMetric(
      sheet.getCell('J5'),
      `Registros  ${transactions.length}`,
      BRAND_COLORS.surface,
      BRAND_COLORS.ink,
    );

    const headerRow = sheet.getRow(7);
    headerRow.values = [
      'ID',
      'Fecha',
      'Referencia',
      'Movimiento',
      'Categoria',
      'Banco',
      'Metodo',
      'Estado',
      'Monto',
      'Factura',
      'Descripcion',
      'Creada',
    ];
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: BRAND_COLORS.white },
        size: 11,
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: BRAND_COLORS.brandDark },
      };
      cell.border = this.getExcelBorder();
    });

    sheet.autoFilter = 'A7:L7';
    sheet.pageSetup.printTitlesRow = '7:7';

    if (!transactions.length) {
      sheet.mergeCells('A8:L11');
      const emptyCell = sheet.getCell('A8');
      emptyCell.value = 'No hay transacciones para los filtros enviados.';
      emptyCell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };
      emptyCell.font = {
        size: 14,
        bold: true,
        color: { argb: BRAND_COLORS.muted },
      };
      emptyCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: BRAND_COLORS.surface },
      };
      emptyCell.border = this.getExcelBorder();
      return;
    }

    transactions.forEach((transaction, index) => {
      const row = sheet.addRow({
        id: transaction.id,
        date: this.formatDate(transaction.date),
        reference: transaction.reference,
        movement: transaction.movement,
        category: transaction.category,
        bank: transaction.bank?.name ?? 'Sin banco',
        method: transaction.method ?? 'Sin metodo',
        status: transaction.status,
        amount: Number(transaction.amount),
        invoiceId: transaction.invoiceId ?? '',
        description: transaction.description ?? '',
        createdAt: transaction.createdAt
          ? this.formatDateTime(transaction.createdAt)
          : '',
      });

      row.height = 24;
      row.eachCell((cell) => {
        cell.border = this.getExcelBorder();
        cell.alignment = {
          vertical: 'middle',
          wrapText: false,
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: index % 2 === 0 ? BRAND_COLORS.white : BRAND_COLORS.surface,
          },
        };
        cell.font = { color: { argb: BRAND_COLORS.ink }, size: 10 };
      });

      row.getCell(11).alignment = {
        vertical: 'middle',
        wrapText: true,
      };

      const movementCell = row.getCell(4);
      movementCell.alignment = { vertical: 'middle', horizontal: 'center' };
      const movementTone = this.getMovementTone(transaction.movement);
      movementCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: movementTone.fill },
      };
      movementCell.font = {
        bold: true,
        color: { argb: movementTone.text },
      };

      const statusCell = row.getCell(8);
      statusCell.alignment = { vertical: 'middle', horizontal: 'center' };

      const amountCell = row.getCell(9);
      amountCell.numFmt = '#,##0.00';
      amountCell.alignment = { vertical: 'middle', horizontal: 'right' };
      amountCell.font = {
        bold: true,
        color: {
          argb:
            Number(transaction.amount) >= 0
              ? BRAND_COLORS.positiveText
              : BRAND_COLORS.negativeText,
        },
      };
    });

    const totalRow = sheet.addRow([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Balance neto',
      stats.balanceTotal,
      '',
      '',
      '',
    ]);
    totalRow.height = 24;
    totalRow.eachCell((cell) => {
      cell.border = this.getExcelBorder();
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: BRAND_COLORS.brandSoft },
      };
      cell.font = {
        bold: true,
        color: { argb: BRAND_COLORS.brandDark },
      };
    });
    totalRow.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
    totalRow.getCell(9).numFmt = '#,##0.00';
    totalRow.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
  }

  private paintExcelMetricCard(
    sheet: ExcelJS.Worksheet,
    range: string,
    label: string,
    value: string,
    fill: string,
    textColor: string,
  ): void {
    sheet.mergeCells(range);
    const [startCell] = range.split(':');
    const cell = sheet.getCell(startCell);
    cell.value = `${label}\n${value}`;
    cell.alignment = {
      wrapText: true,
      vertical: 'middle',
      horizontal: 'center',
    };
    cell.font = {
      bold: true,
      size: 16,
      color: { argb: textColor },
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: fill },
    };
    cell.border = this.getExcelBorder();
  }

  private paintExcelInlineMetric(
    cell: ExcelJS.Cell,
    value: string,
    fill: string,
    textColor: string,
  ): void {
    cell.value = value;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.font = { bold: true, size: 11, color: { argb: textColor } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: fill },
    };
    cell.border = this.getExcelBorder();
  }

  private async generatePdfBuffer(
    transactions: Transaction[],
    stats: TransactionStats,
    filters: FilterSubset,
    exportedAt: Date,
  ): Promise<ExportFile> {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 36,
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

      this.drawPdfIntro(doc, stats, filters, exportedAt, transactions.length);

      if (transactions.length) {
        this.drawPdfTable(doc, transactions);
      } else {
        this.drawPdfEmptyState(doc);
      }

      this.drawPdfFooters(doc);
      doc.end();
    });
  }

  private drawPdfIntro(
    doc: PDFKit.PDFDocument,
    stats: TransactionStats,
    filters: FilterSubset,
    exportedAt: Date,
    totalRecords: number,
  ): void {
    doc.save();
    doc.rect(0, 0, doc.page.width, 118).fill(`#${BRAND_COLORS.brandDark}`);
    doc
      .circle(doc.page.width - 90, 40, 50)
      .fillOpacity(0.08)
      .fill('#FFFFFF');
    doc
      .circle(doc.page.width - 40, 82, 34)
      .fillOpacity(0.08)
      .fill('#FFFFFF');
    doc.restore();

    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(24)
      .text('Reporte de Transacciones', 36, 34);
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#CCFBF1')
      .text(
        `Generado ${this.formatDateTime(exportedAt)}  |  ${totalRecords} registros exportados`,
        36,
        68,
      );

    const cardY = 138;
    const cardWidth = 172;
    const cardHeight = 66;
    const cardGap = 14;
    const firstX = 36;
    const cardPositions = [
      firstX,
      firstX + cardWidth + cardGap,
      firstX + (cardWidth + cardGap) * 2,
      firstX + (cardWidth + cardGap) * 3,
    ];

    this.drawPdfMetricCard(
      doc,
      cardPositions[0],
      cardY,
      cardWidth,
      cardHeight,
      'Ingresos',
      this.formatAmount(stats.ingresos),
      `#${BRAND_COLORS.positive}`,
      `#${BRAND_COLORS.positiveText}`,
    );
    this.drawPdfMetricCard(
      doc,
      cardPositions[1],
      cardY,
      cardWidth,
      cardHeight,
      'Egresos',
      this.formatAmount(stats.egresos),
      `#${BRAND_COLORS.negative}`,
      `#${BRAND_COLORS.negativeText}`,
    );
    this.drawPdfMetricCard(
      doc,
      cardPositions[2],
      cardY,
      cardWidth,
      cardHeight,
      'Balance',
      this.formatAmount(stats.balanceTotal),
      `#${BRAND_COLORS.brandSoft}`,
      `#${BRAND_COLORS.brandDark}`,
    );
    this.drawPdfMetricCard(
      doc,
      cardPositions[3],
      cardY,
      cardWidth,
      cardHeight,
      'Transacciones',
      String(totalRecords),
      '#F8FAFC',
      `#${BRAND_COLORS.ink}`,
    );

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(`#${BRAND_COLORS.brandDark}`)
      .text('Filtros', 36, 226);

    let chipX = 36;
    const chipY = 242;
    const chips = [
      `Movimiento: ${filters.movement ?? 'Todos'}`,
      `Categoria: ${filters.category ?? 'Todas'}`,
      `Desde: ${filters.startDate ?? 'Sin filtro'}`,
      `Hasta: ${filters.endDate ?? 'Sin filtro'}`,
    ];

    chips.forEach((chip) => {
      const width = Math.max(doc.widthOfString(chip) + 22, 116);
      this.drawPdfChip(doc, chipX, chipY, width, 24, chip);
      chipX += width + 10;
    });

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(`#${BRAND_COLORS.ink}`)
      .text('Detalle de movimientos', 36, 282);
  }

  private drawPdfMetricCard(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    value: string,
    fillColor: string,
    textColor: string,
  ): void {
    doc.save();
    doc.roundedRect(x, y, width, height, 14).fill(fillColor);
    doc.restore();
    doc.save();
    doc.roundedRect(x, y, width, height, 14).lineWidth(1).stroke('#E2E8F0');
    doc.restore();

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(textColor)
      .text(label.toUpperCase(), x + 16, y + 14, { width: width - 32 });
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor(textColor)
      .text(value, x + 16, y + 32, { width: width - 32 });
  }

  private drawPdfChip(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
  ): void {
    doc.save();
    doc.roundedRect(x, y, width, height, 12).fill('#F1F5F9');
    doc.restore();
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(`#${BRAND_COLORS.ink}`)
      .text(text, x + 11, y + 7, {
        width: width - 22,
        align: 'center',
      });
  }

  private drawPdfTable(
    doc: PDFKit.PDFDocument,
    transactions: Transaction[],
  ): void {
    const columns = [
      { key: 'date', label: 'Fecha', width: 58 },
      { key: 'reference', label: 'Referencia', width: 84 },
      { key: 'movement', label: 'Movimiento', width: 82 },
      { key: 'category', label: 'Categoria', width: 88 },
      { key: 'bank', label: 'Banco', width: 82 },
      { key: 'method', label: 'Metodo', width: 76 },
      { key: 'status', label: 'Estado', width: 74 },
      { key: 'amount', label: 'Monto', width: 82 },
      { key: 'description', label: 'Descripcion', width: 130 },
    ] as const;

    let y = 304;
    y = this.drawPdfTableHeader(doc, columns, y);

    transactions.forEach((transaction, index) => {
      const rowValues = {
        date: this.formatDate(transaction.date),
        reference: transaction.reference,
        movement: transaction.movement,
        category: transaction.category,
        bank: transaction.bank?.name ?? 'Sin banco',
        method: transaction.method ?? 'Sin metodo',
        status: transaction.status,
        amount: this.formatAmount(Number(transaction.amount)),
        description: transaction.description ?? '-',
      };

      const rowHeight = this.measurePdfRowHeight(doc, columns, rowValues);
      const availableBottom = doc.page.height - doc.page.margins.bottom - 28;

      if (y + rowHeight > availableBottom) {
        doc.addPage();
        this.drawPdfPageContinuation(doc);
        y = this.drawPdfTableHeader(doc, columns, 92);
      }

      y = this.drawPdfRow(
        doc,
        columns,
        rowValues,
        transaction,
        y,
        rowHeight,
        index,
      );
    });
  }

  private drawPdfPageContinuation(doc: PDFKit.PDFDocument): void {
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(`#${BRAND_COLORS.brandDark}`)
      .text('Detalle de transacciones', 36, 36);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(`#${BRAND_COLORS.muted}`)
      .text('Continuacion del reporte exportado desde Jook ERP', 36, 58);
  }

  private drawPdfTableHeader(
    doc: PDFKit.PDFDocument,
    columns: ReadonlyArray<{ key: string; label: string; width: number }>,
    y: number,
  ): number {
    let x = doc.page.margins.left;
    const headerHeight = 28;

    columns.forEach((column) => {
      doc.save();
      doc.rect(x, y, column.width, headerHeight).fill(`#${BRAND_COLORS.brand}`);
      doc.restore();
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#FFFFFF')
        .text(column.label, x + 8, y + 9, {
          width: column.width - 16,
          align: column.key === 'amount' ? 'right' : 'left',
        });
      x += column.width;
    });

    return y + headerHeight;
  }

  private measurePdfRowHeight(
    doc: PDFKit.PDFDocument,
    columns: ReadonlyArray<{ key: string; label: string; width: number }>,
    rowValues: Record<string, string>,
  ): number {
    let maxHeight = 24;

    columns.forEach((column) => {
      const text = rowValues[column.key] ?? '';
      const textHeight = doc.heightOfString(text, {
        width: column.width - 14,
        align: column.key === 'amount' ? 'right' : 'left',
      });
      maxHeight = Math.max(maxHeight, textHeight + 12);
    });

    return Math.max(maxHeight, 28);
  }

  private drawPdfRow(
    doc: PDFKit.PDFDocument,
    columns: ReadonlyArray<{ key: string; label: string; width: number }>,
    rowValues: Record<string, string>,
    transaction: Transaction,
    y: number,
    rowHeight: number,
    index: number,
  ): number {
    let x = doc.page.margins.left;
    const movementTone = this.getMovementTone(transaction.movement);

    doc.save();
    doc
      .rect(
        doc.page.margins.left,
        y,
        columns.reduce((total, column) => total + column.width, 0),
        rowHeight,
      )
      .fill(index % 2 === 0 ? '#FFFFFF' : '#F8FAFC');
    doc.restore();

    columns.forEach((column) => {
      doc.save();
      doc.rect(x, y, column.width, rowHeight).lineWidth(0.6).stroke('#E2E8F0');
      doc.restore();

      if (column.key === 'movement') {
        this.drawPdfBadge(
          doc,
          x + 8,
          y + 6,
          column.width - 16,
          16,
          rowValues[column.key],
          `#${movementTone.fill}`,
          `#${movementTone.text}`,
        );
      } else {
        const textColor =
          column.key === 'amount'
            ? Number(transaction.amount) >= 0
              ? `#${BRAND_COLORS.positiveText}`
              : `#${BRAND_COLORS.negativeText}`
            : `#${BRAND_COLORS.ink}`;

        doc
          .font(column.key === 'amount' ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(8.5)
          .fillColor(textColor)
          .text(rowValues[column.key] ?? '', x + 7, y + 7, {
            width: column.width - 14,
            align: column.key === 'amount' ? 'right' : 'left',
          });
      }

      x += column.width;
    });

    return y + rowHeight;
  }

  private drawPdfBadge(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    fillColor: string,
    textColor: string,
  ): void {
    doc.save();
    doc.roundedRect(x, y, width, height, 8).fill(fillColor);
    doc.restore();
    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor(textColor)
      .text(text, x + 4, y + 4.5, {
        width: width - 8,
        align: 'center',
      });
  }

  private drawPdfEmptyState(doc: PDFKit.PDFDocument): void {
    doc.save();
    doc.roundedRect(120, 320, 600, 120, 18).fill('#F8FAFC');
    doc.restore();
    doc.save();
    doc.roundedRect(120, 320, 600, 120, 18).lineWidth(1).stroke('#E2E8F0');
    doc.restore();
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor(`#${BRAND_COLORS.brandDark}`)
      .text('No hay transacciones para exportar', 120, 356, {
        width: 600,
        align: 'center',
      });
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(`#${BRAND_COLORS.muted}`)
      .text(
        'Prueba con un rango de fechas mas amplio o quita alguno de los filtros antes de volver a exportar.',
        170,
        388,
        {
          width: 500,
          align: 'center',
        },
      );
  }

  private drawPdfFooters(doc: PDFKit.PDFDocument): void {
    const pageRange = doc.bufferedPageRange();

    for (let pageIndex = 0; pageIndex < pageRange.count; pageIndex += 1) {
      doc.switchToPage(pageIndex);

      const footerY = doc.page.height - 28;
      doc.save();
      doc
        .moveTo(doc.page.margins.left, footerY - 8)
        .lineTo(doc.page.width - doc.page.margins.right, footerY - 8)
        .strokeColor('#E2E8F0')
        .lineWidth(1)
        .stroke();
      doc.restore();

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(`#${BRAND_COLORS.muted}`)
        .text('Jook ERP', doc.page.margins.left, footerY, {
          width: 140,
          align: 'left',
        });
      doc.text(
        `Pagina ${pageIndex + 1} de ${pageRange.count}`,
        doc.page.margins.left,
        footerY,
        {
          width:
            doc.page.width - doc.page.margins.left - doc.page.margins.right,
          align: 'right',
        },
      );
    }
  }

  private getExcelBorder(): Partial<ExcelJS.Borders> {
    return {
      top: { style: 'thin', color: { argb: BRAND_COLORS.line } },
      left: { style: 'thin', color: { argb: BRAND_COLORS.line } },
      bottom: { style: 'thin', color: { argb: BRAND_COLORS.line } },
      right: { style: 'thin', color: { argb: BRAND_COLORS.line } },
    };
  }

  private getMovementTone(movement: MovementType): {
    fill: string;
    text: string;
  } {
    if (movement === MovementType.ENTRADA) {
      return {
        fill: BRAND_COLORS.positive,
        text: BRAND_COLORS.positiveText,
      };
    }

    if (movement === MovementType.SALIDA) {
      return {
        fill: BRAND_COLORS.negative,
        text: BRAND_COLORS.negativeText,
      };
    }

    return {
      fill: BRAND_COLORS.warning,
      text: BRAND_COLORS.warningText,
    };
  }

  private formatDate(value: Date | string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toISOString().slice(0, 10);
  }

  private formatDateTime(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);

    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(date);
  }

  private formatAmount(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}
