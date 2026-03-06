import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Product } from '../Inventory/entities/product.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import {
  Invoice,
  InvoiceStatus,
  InvoiceType,
} from '../invoices/entities/invoice.entity';
import {
  MovementType,
  Transaction,
} from '../transactions/entities/transaction.entity';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import {
  TopProductsFilterDto,
  TopProductsMetric,
} from './dto/top-products-filter.dto';

interface AuthenticatedUser {
  id: number;
  role: number;
  companyId: number;
}

interface RawTransactionSummary {
  ingresos: string | null;
  egresos: string | null;
}

interface RawInvoiceSummary {
  total: string | null;
  pendientes: string | null;
  vencidas: string | null;
  pagadas: string | null;
  anuladas: string | null;
  overdueOpen: string | null;
  ventasFacturadas: string | null;
  comprasFacturadas: string | null;
}

interface RawInventorySummary {
  totalProducts: string | null;
  outOfStock: string | null;
  lowStock: string | null;
  totalStockUnits: string | null;
  totalCostValue: string | null;
  totalRetailValue: string | null;
}

interface RawInvoiceAlert {
  id: string;
  invoiceNumber: string;
  contactName: string | null;
  totalAmount: string | null;
  dueDate: string;
  status: InvoiceStatus;
  invoiceType: InvoiceType;
}

interface RawCashFlowByDay {
  date: string;
  ingresos: string | null;
  egresos: string | null;
}

interface RawSalesVsPurchasesByMonth {
  month: string;
  ventas: string | null;
  compras: string | null;
}

interface RawStatusDistribution {
  status: InvoiceStatus;
  count: string | null;
}

interface RawTransactionCategoryDistribution {
  category: string;
  total: string | null;
}

interface RawTopProduct {
  productId: string;
  productCode: string | null;
  productName: string | null;
  totalQuantity: string | null;
  totalAmount: string | null;
  invoicesCount: string | null;
}

interface DashboardPeriod {
  startDate: string | null;
  endDate: string | null;
}

interface DashboardInvoiceAlerts {
  dueSoon: DashboardInvoiceAlertItem[];
  overdue: DashboardInvoiceAlertItem[];
}

interface DashboardInventoryAlerts {
  lowStockProducts: DashboardLowStockItem[];
}

interface DashboardOverviewFinancial {
  ingresos: number;
  egresos: number;
  balance: number;
  ventasFacturadas: number;
  comprasFacturadas: number;
}

interface DashboardOverviewInvoices {
  total: number;
  pendientes: number;
  vencidas: number;
  pagadas: number;
  anuladas: number;
  overdueOpen: number;
}

interface DashboardOverviewInventory {
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
  totalStockUnits: number;
  totalCostValue: number;
  totalRetailValue: number;
}

interface DashboardInvoiceAlertItem {
  id: number;
  invoiceNumber: string;
  contactName: string;
  totalAmount: number;
  dueDate: string;
  status: InvoiceStatus;
  invoiceType: InvoiceType;
}

interface DashboardLowStockItem {
  id: number;
  code: string;
  name: string;
  stock: number;
  minStock: number;
}

interface DashboardCashFlowPoint {
  date: string;
  ingresos: number;
  egresos: number;
  balance: number;
}

interface DashboardSalesVsPurchasesPoint {
  month: string;
  ventas: number;
  compras: number;
}

interface DashboardStatusDistributionPoint {
  status: InvoiceStatus;
  count: number;
}

interface DashboardTransactionCategoryPoint {
  category: string;
  total: number;
}

interface DashboardTopProductItem {
  productId: number;
  productCode: string;
  productName: string;
  totalQuantity: number;
  totalAmount: number;
  invoicesCount: number;
}

export interface DashboardOverviewResponse {
  period: DashboardPeriod;
  financial: DashboardOverviewFinancial;
  invoices: DashboardOverviewInvoices;
  inventory: DashboardOverviewInventory;
  alerts: DashboardInvoiceAlerts & DashboardInventoryAlerts;
}

export interface DashboardChartsResponse {
  period: DashboardPeriod;
  cashFlowByDay: DashboardCashFlowPoint[];
  salesVsPurchasesByMonth: DashboardSalesVsPurchasesPoint[];
  invoiceStatusDistribution: DashboardStatusDistributionPoint[];
  transactionCategoryDistribution: DashboardTransactionCategoryPoint[];
}

export interface DashboardTopProductsResponse {
  period: DashboardPeriod;
  metric: TopProductsMetric;
  limit: number;
  data: DashboardTopProductItem[];
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly itemRepo: Repository<InvoiceItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async getOverview(
    filters: DashboardFilterDto,
    user: AuthenticatedUser,
  ): Promise<DashboardOverviewResponse> {
    const [
      transactionSummary,
      invoiceSummary,
      inventorySummary,
      dueSoon,
      overdue,
      lowStockProducts,
    ] = await Promise.all([
      this.getTransactionSummary(filters, user),
      this.getInvoiceSummary(filters, user),
      this.getInventorySummary(user),
      this.getDueSoonInvoices(user, 7, 8),
      this.getOverdueInvoices(user, 8),
      this.getLowStockProducts(user, 10),
    ]);

    return {
      period: this.buildPeriod(filters),
      financial: {
        ingresos: transactionSummary.ingresos,
        egresos: transactionSummary.egresos,
        balance: transactionSummary.ingresos - transactionSummary.egresos,
        ventasFacturadas: invoiceSummary.ventasFacturadas,
        comprasFacturadas: invoiceSummary.comprasFacturadas,
      },
      invoices: invoiceSummary,
      inventory: inventorySummary,
      alerts: {
        dueSoon,
        overdue,
        lowStockProducts,
      },
    };
  }

  async getCharts(
    filters: DashboardFilterDto,
    user: AuthenticatedUser,
  ): Promise<DashboardChartsResponse> {
    const [
      cashFlowByDay,
      salesVsPurchasesByMonth,
      invoiceStatusDistribution,
      transactionCategoryDistribution,
    ] = await Promise.all([
      this.getCashFlowByDay(filters, user),
      this.getSalesVsPurchasesByMonth(filters, user),
      this.getInvoiceStatusDistribution(filters, user),
      this.getTransactionCategoryDistribution(filters, user),
    ]);

    return {
      period: this.buildPeriod(filters),
      cashFlowByDay,
      salesVsPurchasesByMonth,
      invoiceStatusDistribution,
      transactionCategoryDistribution,
    };
  }

  async getTopProducts(
    filters: TopProductsFilterDto,
    user: AuthenticatedUser,
  ): Promise<DashboardTopProductsResponse> {
    const limit = filters.limit ?? 10;
    const metric = filters.metric ?? TopProductsMetric.QUANTITY;
    const orderExpression =
      metric === TopProductsMetric.AMOUNT
        ? 'SUM(item.quantity * item.unit_price)'
        : 'SUM(item.quantity)';

    const qb = this.itemRepo
      .createQueryBuilder('item')
      .innerJoin(Invoice, 'inv', 'inv.id = item.invoice_id')
      .leftJoin(Product, 'prod', 'prod.id = item.product_id')
      .select('item.product_id', 'productId')
      .addSelect('MAX(prod.code)', 'productCode')
      .addSelect('MAX(prod.name)', 'productName')
      .addSelect('COALESCE(SUM(item.quantity), 0)', 'totalQuantity')
      .addSelect('COALESCE(SUM(item.quantity * item.unit_price), 0)', 'totalAmount')
      .addSelect('COUNT(DISTINCT inv.id)', 'invoicesCount')
      .where('inv.company_id = :companyId', { companyId: user.companyId })
      .andWhere('inv.invoice_type = :invoiceType', {
        invoiceType: InvoiceType.VENTA,
      })
      .andWhere('inv.status <> :anulada', { anulada: InvoiceStatus.ANULADA })
      .groupBy('item.product_id')
      .orderBy(orderExpression, 'DESC')
      .addOrderBy('item.product_id', 'ASC')
      .limit(limit);

    if (this.isRestrictedUser(user)) {
      qb.andWhere('inv.user_id = :userId', { userId: user.id });
    }

    this.applyDateRangeFilter(qb, 'inv.issue_date', filters, 'issue');

    const rows = await qb.getRawMany<RawTopProduct>();

    return {
      period: this.buildPeriod(filters),
      metric,
      limit,
      data: rows.map((row) => ({
        productId: Number(row.productId),
        productCode: row.productCode?.trim() || `#${row.productId}`,
        productName: row.productName?.trim() || `Producto ${row.productId}`,
        totalQuantity: this.toNumber(row.totalQuantity),
        totalAmount: this.toNumber(row.totalAmount),
        invoicesCount: this.toNumber(row.invoicesCount),
      })),
    };
  }

  private async getTransactionSummary(
    filters: DashboardFilterDto,
    user: AuthenticatedUser,
  ): Promise<{ ingresos: number; egresos: number }> {
    const qb = this.transactionRepo
      .createQueryBuilder('tx')
      .select(
        `COALESCE(SUM(CASE
          WHEN tx.movement = :entrada THEN ABS(tx.amount)
          WHEN tx.movement = :ajuste AND tx.amount >= 0 THEN ABS(tx.amount)
          ELSE 0
        END), 0)`,
        'ingresos',
      )
      .addSelect(
        `COALESCE(SUM(CASE
          WHEN tx.movement = :salida THEN ABS(tx.amount)
          WHEN tx.movement = :ajuste AND tx.amount < 0 THEN ABS(tx.amount)
          ELSE 0
        END), 0)`,
        'egresos',
      )
      .where('tx.company_id = :companyId', { companyId: user.companyId })
      .setParameters({
        entrada: MovementType.ENTRADA,
        salida: MovementType.SALIDA,
        ajuste: MovementType.AJUSTE,
      });

    this.applyDateRangeFilter(qb, 'tx.date', filters, 'txDate');

    const raw = await qb.getRawOne<RawTransactionSummary>();

    return {
      ingresos: this.toNumber(raw?.ingresos),
      egresos: this.toNumber(raw?.egresos),
    };
  }

  private async getInvoiceSummary(
    filters: DashboardFilterDto,
    user: AuthenticatedUser,
  ): Promise<DashboardOverviewInvoices & Pick<DashboardOverviewFinancial, 'ventasFacturadas' | 'comprasFacturadas'>> {
    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .select('COUNT(*)', 'total')
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.status = :pendiente THEN 1 ELSE 0 END), 0)`,
        'pendientes',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.status = :vencida THEN 1 ELSE 0 END), 0)`,
        'vencidas',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.status = :pagada THEN 1 ELSE 0 END), 0)`,
        'pagadas',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.status = :anulada THEN 1 ELSE 0 END), 0)`,
        'anuladas',
      )
      .addSelect(
        `COALESCE(SUM(CASE
          WHEN inv.due_date < CURRENT_DATE
            AND inv.status IN (:...overdueStatuses)
          THEN 1 ELSE 0
        END), 0)`,
        'overdueOpen',
      )
      .addSelect(
        `COALESCE(SUM(CASE
          WHEN inv.invoice_type = :venta
            AND inv.status <> :anulada
          THEN inv.total_amount ELSE 0
        END), 0)`,
        'ventasFacturadas',
      )
      .addSelect(
        `COALESCE(SUM(CASE
          WHEN inv.invoice_type = :compra
            AND inv.status <> :anulada
          THEN inv.total_amount ELSE 0
        END), 0)`,
        'comprasFacturadas',
      )
      .where('inv.company_id = :companyId', { companyId: user.companyId })
      .setParameters({
        pendiente: InvoiceStatus.PENDIENTE,
        vencida: InvoiceStatus.VENCIDA,
        pagada: InvoiceStatus.PAGADA,
        anulada: InvoiceStatus.ANULADA,
        venta: InvoiceType.VENTA,
        compra: InvoiceType.COMPRA,
        overdueStatuses: [InvoiceStatus.PENDIENTE, InvoiceStatus.VENCIDA],
      });

    if (this.isRestrictedUser(user)) {
      qb.andWhere('inv.user_id = :userId', { userId: user.id });
    }

    this.applyDateRangeFilter(qb, 'inv.issue_date', filters, 'invIssue');

    const raw = await qb.getRawOne<RawInvoiceSummary>();

    return {
      total: this.toNumber(raw?.total),
      pendientes: this.toNumber(raw?.pendientes),
      vencidas: this.toNumber(raw?.vencidas),
      pagadas: this.toNumber(raw?.pagadas),
      anuladas: this.toNumber(raw?.anuladas),
      overdueOpen: this.toNumber(raw?.overdueOpen),
      ventasFacturadas: this.toNumber(raw?.ventasFacturadas),
      comprasFacturadas: this.toNumber(raw?.comprasFacturadas),
    };
  }

  private async getInventorySummary(
    user: AuthenticatedUser,
  ): Promise<DashboardOverviewInventory> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .select('COUNT(*)', 'totalProducts')
      .addSelect(
        'COALESCE(SUM(CASE WHEN p.stock = 0 THEN 1 ELSE 0 END), 0)',
        'outOfStock',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN p.stock > 0 AND p.stock <= p.min_stock THEN 1 ELSE 0 END), 0)',
        'lowStock',
      )
      .addSelect('COALESCE(SUM(p.stock), 0)', 'totalStockUnits')
      .addSelect('COALESCE(SUM(p.cost * p.stock), 0)', 'totalCostValue')
      .addSelect(
        'COALESCE(SUM(p.sale_price * p.stock), 0)',
        'totalRetailValue',
      )
      .where('p.company_id = :companyId', { companyId: user.companyId });

    if (this.isRestrictedUser(user)) {
      qb.andWhere('p.user_id = :userId', { userId: user.id });
    }

    const raw = await qb.getRawOne<RawInventorySummary>();

    return {
      totalProducts: this.toNumber(raw?.totalProducts),
      outOfStock: this.toNumber(raw?.outOfStock),
      lowStock: this.toNumber(raw?.lowStock),
      totalStockUnits: this.toNumber(raw?.totalStockUnits),
      totalCostValue: this.toNumber(raw?.totalCostValue),
      totalRetailValue: this.toNumber(raw?.totalRetailValue),
    };
  }

  private async getDueSoonInvoices(
    user: AuthenticatedUser,
    daysAhead: number,
    limit: number,
  ): Promise<DashboardInvoiceAlertItem[]> {
    const today = this.getCurrentLocalDate();
    const endDate = this.addDays(today, daysAhead);

    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .leftJoin('inv.contact', 'contact')
      .select('inv.id', 'id')
      .addSelect('inv.invoice_number', 'invoiceNumber')
      .addSelect('contact.name', 'contactName')
      .addSelect('inv.total_amount', 'totalAmount')
      .addSelect(`TO_CHAR(inv.due_date, 'YYYY-MM-DD')`, 'dueDate')
      .addSelect('inv.status', 'status')
      .addSelect('inv.invoice_type', 'invoiceType')
      .where('inv.company_id = :companyId', { companyId: user.companyId })
      .andWhere('inv.status = :pendiente', {
        pendiente: InvoiceStatus.PENDIENTE,
      })
      .andWhere('inv.due_date >= :today', { today })
      .andWhere('inv.due_date <= :endDate', { endDate })
      .orderBy('inv.due_date', 'ASC')
      .limit(limit);

    if (this.isRestrictedUser(user)) {
      qb.andWhere('inv.user_id = :userId', { userId: user.id });
    }

    const rows = await qb.getRawMany<RawInvoiceAlert>();
    return this.mapInvoiceAlerts(rows);
  }

  private async getOverdueInvoices(
    user: AuthenticatedUser,
    limit: number,
  ): Promise<DashboardInvoiceAlertItem[]> {
    const today = this.getCurrentLocalDate();
    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .leftJoin('inv.contact', 'contact')
      .select('inv.id', 'id')
      .addSelect('inv.invoice_number', 'invoiceNumber')
      .addSelect('contact.name', 'contactName')
      .addSelect('inv.total_amount', 'totalAmount')
      .addSelect(`TO_CHAR(inv.due_date, 'YYYY-MM-DD')`, 'dueDate')
      .addSelect('inv.status', 'status')
      .addSelect('inv.invoice_type', 'invoiceType')
      .where('inv.company_id = :companyId', { companyId: user.companyId })
      .andWhere('inv.status IN (:...overdueStatuses)', {
        overdueStatuses: [InvoiceStatus.PENDIENTE, InvoiceStatus.VENCIDA],
      })
      .andWhere('inv.due_date < :today', { today })
      .orderBy('inv.due_date', 'ASC')
      .limit(limit);

    if (this.isRestrictedUser(user)) {
      qb.andWhere('inv.user_id = :userId', { userId: user.id });
    }

    const rows = await qb.getRawMany<RawInvoiceAlert>();
    return this.mapInvoiceAlerts(rows);
  }

  private async getLowStockProducts(
    user: AuthenticatedUser,
    limit: number,
  ): Promise<DashboardLowStockItem[]> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .addSelect('p.code', 'code')
      .addSelect('p.name', 'name')
      .addSelect('p.stock', 'stock')
      .addSelect('p.min_stock', 'minStock')
      .where('p.company_id = :companyId', { companyId: user.companyId })
      .andWhere('p.stock <= p.min_stock')
      .orderBy('p.stock', 'ASC')
      .addOrderBy('p.updated_at', 'DESC')
      .limit(limit);

    if (this.isRestrictedUser(user)) {
      qb.andWhere('p.user_id = :userId', { userId: user.id });
    }

    const rows = await qb.getRawMany<{
      id: string;
      code: string | null;
      name: string | null;
      stock: string | null;
      minStock: string | null;
    }>();

    return rows.map((row) => ({
      id: Number(row.id),
      code: row.code?.trim() || `#${row.id}`,
      name: row.name?.trim() || `Producto ${row.id}`,
      stock: this.toNumber(row.stock),
      minStock: this.toNumber(row.minStock),
    }));
  }

  private async getCashFlowByDay(
    filters: DashboardFilterDto,
    user: AuthenticatedUser,
  ): Promise<DashboardCashFlowPoint[]> {
    const qb = this.transactionRepo
      .createQueryBuilder('tx')
      .select(`TO_CHAR(tx.date, 'YYYY-MM-DD')`, 'date')
      .addSelect(
        `COALESCE(SUM(CASE
          WHEN tx.movement = :entrada THEN ABS(tx.amount)
          WHEN tx.movement = :ajuste AND tx.amount >= 0 THEN ABS(tx.amount)
          ELSE 0
        END), 0)`,
        'ingresos',
      )
      .addSelect(
        `COALESCE(SUM(CASE
          WHEN tx.movement = :salida THEN ABS(tx.amount)
          WHEN tx.movement = :ajuste AND tx.amount < 0 THEN ABS(tx.amount)
          ELSE 0
        END), 0)`,
        'egresos',
      )
      .where('tx.company_id = :companyId', { companyId: user.companyId })
      .setParameters({
        entrada: MovementType.ENTRADA,
        salida: MovementType.SALIDA,
        ajuste: MovementType.AJUSTE,
      })
      .groupBy('tx.date')
      .orderBy('tx.date', 'ASC');

    this.applyDateRangeFilter(qb, 'tx.date', filters, 'txDate');

    const rows = await qb.getRawMany<RawCashFlowByDay>();
    return rows.map((row) => {
      const ingresos = this.toNumber(row.ingresos);
      const egresos = this.toNumber(row.egresos);

      return {
        date: row.date,
        ingresos,
        egresos,
        balance: ingresos - egresos,
      };
    });
  }

  private async getSalesVsPurchasesByMonth(
    filters: DashboardFilterDto,
    user: AuthenticatedUser,
  ): Promise<DashboardSalesVsPurchasesPoint[]> {
    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .select(`TO_CHAR(DATE_TRUNC('month', inv.issue_date), 'YYYY-MM')`, 'month')
      .addSelect(
        `COALESCE(SUM(CASE
          WHEN inv.invoice_type = :venta
            AND inv.status <> :anulada
          THEN inv.total_amount ELSE 0
        END), 0)`,
        'ventas',
      )
      .addSelect(
        `COALESCE(SUM(CASE
          WHEN inv.invoice_type = :compra
            AND inv.status <> :anulada
          THEN inv.total_amount ELSE 0
        END), 0)`,
        'compras',
      )
      .where('inv.company_id = :companyId', { companyId: user.companyId })
      .setParameters({
        venta: InvoiceType.VENTA,
        compra: InvoiceType.COMPRA,
        anulada: InvoiceStatus.ANULADA,
      })
      .groupBy(`DATE_TRUNC('month', inv.issue_date)`)
      .orderBy(`DATE_TRUNC('month', inv.issue_date)`, 'ASC');

    if (this.isRestrictedUser(user)) {
      qb.andWhere('inv.user_id = :userId', { userId: user.id });
    }

    this.applyDateRangeFilter(qb, 'inv.issue_date', filters, 'issue');

    const rows = await qb.getRawMany<RawSalesVsPurchasesByMonth>();
    return rows.map((row) => ({
      month: row.month,
      ventas: this.toNumber(row.ventas),
      compras: this.toNumber(row.compras),
    }));
  }

  private async getInvoiceStatusDistribution(
    filters: DashboardFilterDto,
    user: AuthenticatedUser,
  ): Promise<DashboardStatusDistributionPoint[]> {
    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .select('inv.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('inv.company_id = :companyId', { companyId: user.companyId })
      .groupBy('inv.status')
      .orderBy('inv.status', 'ASC');

    if (this.isRestrictedUser(user)) {
      qb.andWhere('inv.user_id = :userId', { userId: user.id });
    }

    this.applyDateRangeFilter(qb, 'inv.issue_date', filters, 'issue');

    const rows = await qb.getRawMany<RawStatusDistribution>();
    const countMap = new Map(
      rows.map((row) => [row.status, this.toNumber(row.count)]),
    );

    return Object.values(InvoiceStatus).map((status) => ({
      status,
      count: countMap.get(status) ?? 0,
    }));
  }

  private async getTransactionCategoryDistribution(
    filters: DashboardFilterDto,
    user: AuthenticatedUser,
  ): Promise<DashboardTransactionCategoryPoint[]> {
    const qb = this.transactionRepo
      .createQueryBuilder('tx')
      .select(`COALESCE(NULLIF(TRIM(tx.category), ''), 'Sin categoria')`, 'category')
      .addSelect('COALESCE(SUM(ABS(tx.amount)), 0)', 'total')
      .where('tx.company_id = :companyId', { companyId: user.companyId })
      .groupBy(`COALESCE(NULLIF(TRIM(tx.category), ''), 'Sin categoria')`)
      .orderBy('total', 'DESC')
      .limit(8);

    this.applyDateRangeFilter(qb, 'tx.date', filters, 'txDate');

    const rows = await qb.getRawMany<RawTransactionCategoryDistribution>();
    return rows.map((row) => ({
      category: row.category,
      total: this.toNumber(row.total),
    }));
  }

  private applyDateRangeFilter(
    qb: SelectQueryBuilder<any>,
    column: string,
    filters: DashboardFilterDto,
    paramPrefix: string,
  ): void {
    if (filters.startDate) {
      qb.andWhere(`${column} >= :${paramPrefix}StartDate`, {
        [`${paramPrefix}StartDate`]: filters.startDate,
      });
    }

    if (filters.endDate) {
      qb.andWhere(`${column} <= :${paramPrefix}EndDate`, {
        [`${paramPrefix}EndDate`]: filters.endDate,
      });
    }
  }

  private mapInvoiceAlerts(rows: RawInvoiceAlert[]): DashboardInvoiceAlertItem[] {
    return rows.map((row) => ({
      id: Number(row.id),
      invoiceNumber: row.invoiceNumber,
      contactName: row.contactName?.trim() || 'Sin contacto',
      totalAmount: this.toNumber(row.totalAmount),
      dueDate: row.dueDate,
      status: row.status,
      invoiceType: row.invoiceType,
    }));
  }

  private buildPeriod(filters: DashboardFilterDto): DashboardPeriod {
    return {
      startDate: filters.startDate ?? null,
      endDate: filters.endDate ?? null,
    };
  }

  private isRestrictedUser(user: AuthenticatedUser): boolean {
    return user.role === 2;
  }

  private toNumber(value: string | number | null | undefined): number {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    return parsed;
  }

  private getCurrentLocalDate(): string {
    return this.formatDateToYmd(new Date());
  }

  private addDays(ymd: string, daysToAdd: number): string {
    const date = new Date(`${ymd}T00:00:00`);
    date.setDate(date.getDate() + daysToAdd);
    return this.formatDateToYmd(date);
  }

  private formatDateToYmd(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
