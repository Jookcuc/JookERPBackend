import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  assertDateRange,
  calculateInclusiveDays,
} from '../../common/utils/date-range.util';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import {
  Invoice,
  InvoiceStatus,
  InvoiceType,
} from '../invoices/entities/invoice.entity';
import { DemandForecastQueryDto } from './dto/demand-forecast-query.dto';
import { ReplenishmentRecommendationQueryDto } from './dto/replenishment-recommendation-query.dto';
import { Product } from './entities/product.entity';

export type ForecastConfidence = 'alta' | 'media' | 'baja' | 'sin_historial';
export type ReplenishmentUrgency = 'critica' | 'alta' | 'media' | 'normal';

interface AuthenticatedUser {
  id: number;
  role: number;
  companyId: number;
}

interface NormalizedForecastFilters {
  startDate: string;
  endDate: string;
  historyDays: number;
  forecastStartDate: string;
  forecastEndDate: string;
  forecastDays: number;
  includeHistory: boolean;
}

interface ForecastProduct {
  productId: number;
  productCode: string;
  productName: string;
  typeId: number;
  currentStock: number;
  minStock: number;
  unitCost: number;
}

interface RawForecastProduct {
  productId: string | number;
  productCode: string | null;
  productName: string | null;
  typeId: string | number | null;
  currentStock: string | number | null;
  minStock: string | number | null;
  unitCost: string | number | null;
}

interface RawDemandRow {
  productId: string | number;
  date: string;
  quantity: string | number | null;
}

export interface DemandPoint {
  date: string;
  quantity: number;
}

export interface ForecastPoint {
  date: string;
  predictedQuantity: number;
  lowerBound: number;
  upperBound: number;
}

interface DemandStats {
  historicalTotal: number;
  averageDailyDemand: number;
  recentAverageDailyDemand: number;
  demandStdDev: number;
  coefficientOfVariation: number;
  peakDailyDemand: number;
  activeDemandDays: number;
  baselineDailyDemand: number;
  trendPerDay: number;
  seasonalFactors: number[];
  mae: number;
  confidence: ForecastConfidence;
}

interface MlForecastProductRequest {
  productId: number;
  productCode: string;
  productName: string;
  history: DemandPoint[];
}

interface MlForecastRequest {
  forecastDays: number;
  products: MlForecastProductRequest[];
}

interface MlForecastPoint {
  date: string;
  predictedQuantity: string | number | null;
  lowerBound: string | number | null;
  upperBound: string | number | null;
}

interface MlProductForecastResponse {
  productId: number;
  forecast: MlForecastPoint[];
  metrics?: {
    confidence?: ForecastConfidence;
  };
}

interface MlForecastResponse {
  model?: {
    name?: string;
    granularity?: string;
    description?: string;
  };
  data?: MlProductForecastResponse[];
}

interface MlForecastResult {
  model: DemandForecastResponse['model'];
  forecastsByProductId: Map<
    number,
    {
      forecast: ForecastPoint[];
      confidence?: ForecastConfidence;
    }
  >;
}

export interface ProductDemandForecast {
  productId: number;
  productCode: string;
  productName: string;
  typeId: number;
  currentStock: number;
  minStock: number;
  unitCost: number;
  history?: DemandPoint[];
  forecast: ForecastPoint[];
  summary: {
    historicalTotal: number;
    historicalAverageDailyDemand: number;
    recentAverageDailyDemand: number;
    projectedDemand: number;
    projectedAverageDailyDemand: number;
    peakDailyDemand: number;
    demandStdDev: number;
    activeDemandDays: number;
    confidence: ForecastConfidence;
  };
}

export interface DemandForecastResponse {
  period: {
    startDate: string;
    endDate: string;
    historyDays: number;
    forecastStartDate: string;
    forecastEndDate: string;
    forecastDays: number;
  };
  model: {
    name: string;
    granularity: 'day';
    description: string;
  };
  totals: {
    productsAnalyzed: number;
    historicalUnits: number;
    forecastUnits: number;
  };
  data: ProductDemandForecast[];
}

export interface ReplenishmentRecommendation {
  productId: number;
  productCode: string;
  productName: string;
  typeId: number;
  currentStock: number;
  minStock: number;
  leadTimeDays: number;
  reviewPeriodDays: number;
  forecast: {
    demandDuringLeadTime: number;
    demandDuringReviewPeriod: number;
    projectedDemandUntilNextReview: number;
    projectedAverageDailyDemand: number;
    confidence: ForecastConfidence;
  };
  safetyStock: number;
  reorderPoint: number;
  targetStock: number;
  recommendedOrderQuantity: number;
  estimatedOrderCost: number;
  shouldReorder: boolean;
  urgency: ReplenishmentUrgency;
  expectedStockoutDate: string | null;
  daysUntilStockout: number | null;
  reasons: string[];
}

export interface ReplenishmentRecommendationResponse {
  period: DemandForecastResponse['period'];
  model: DemandForecastResponse['model'];
  parameters: {
    leadTimeDays: number;
    reviewPeriodDays: number;
    serviceLevel: number;
    serviceLevelZScore: number;
  };
  totals: {
    productsAnalyzed: number;
    productsNeedingReorder: number;
    recommendedUnits: number;
    estimatedCost: number;
  };
  data: ReplenishmentRecommendation[];
}

const LOCAL_FORECAST_MODEL: DemandForecastResponse['model'] = {
  name: 'weighted-moving-average-weekly-seasonality',
  granularity: 'day',
  description:
    'Promedio movil ponderado con ajuste de tendencia y estacionalidad semanal calculado desde facturas de venta.',
};

const DEFAULT_ML_FORECAST_TIMEOUT_MS = 3000;

@Injectable()
export class InventoryForecastService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(InvoiceItem)
    private readonly itemRepo: Repository<InvoiceItem>,
    private readonly configService: ConfigService,
  ) {}

  async getDemandForecast(
    filters: DemandForecastQueryDto,
    user: AuthenticatedUser,
  ): Promise<DemandForecastResponse> {
    const normalized = this.normalizeForecastFilters(filters);
    const products = await this.findForecastProducts(filters, user);

    if (filters.productId && products.length === 0) {
      throw new NotFoundException(
        `Producto con id ${filters.productId} no encontrado`,
      );
    }

    const demandRows = await this.findDemandRows(
      products.map((product) => product.productId),
      normalized,
      user,
    );
    const demandByProduct = this.buildDemandMap(demandRows);
    const historyDates = this.buildDateRange(
      normalized.startDate,
      normalized.endDate,
    );
    const localData = products.map((product) =>
      this.buildProductForecast(
        product,
        historyDates,
        demandByProduct.get(product.productId) ?? new Map<string, number>(),
        { ...normalized, includeHistory: true },
      ),
    );
    const mlForecastResult = await this.tryGetMlForecasts(
      localData,
      normalized,
    );
    const dataWithForecast = mlForecastResult
      ? this.applyMlForecasts(localData, mlForecastResult, normalized)
      : localData;
    const data = this.applyHistoryPreference(
      dataWithForecast,
      normalized.includeHistory,
    );

    return {
      period: {
        startDate: normalized.startDate,
        endDate: normalized.endDate,
        historyDays: normalized.historyDays,
        forecastStartDate: normalized.forecastStartDate,
        forecastEndDate: normalized.forecastEndDate,
        forecastDays: normalized.forecastDays,
      },
      model: this.resolveResponseModel(mlForecastResult, localData.length),
      totals: {
        productsAnalyzed: data.length,
        historicalUnits: this.round2(
          data.reduce((sum, item) => sum + item.summary.historicalTotal, 0),
        ),
        forecastUnits: this.round2(
          data.reduce((sum, item) => sum + item.summary.projectedDemand, 0),
        ),
      },
      data,
    };
  }

  async getReplenishmentRecommendations(
    filters: ReplenishmentRecommendationQueryDto,
    user: AuthenticatedUser,
  ): Promise<ReplenishmentRecommendationResponse> {
    const leadTimeDays = filters.leadTimeDays ?? 7;
    const reviewPeriodDays = filters.reviewPeriodDays ?? 30;
    const serviceLevel = filters.serviceLevel ?? 0.95;
    const serviceLevelZScore = this.getServiceLevelZScore(serviceLevel);
    const requiredForecastDays = Math.max(
      filters.forecastDays ?? 30,
      leadTimeDays + reviewPeriodDays,
    );

    const forecast = await this.getDemandForecast(
      {
        ...filters,
        forecastDays: requiredForecastDays,
        includeHistory: false,
      },
      user,
    );
    const allRecommendations = forecast.data.map((item) =>
      this.buildReplenishmentRecommendation(
        item,
        leadTimeDays,
        reviewPeriodDays,
        serviceLevelZScore,
      ),
    );
    let recommendations = allRecommendations;

    if (filters.onlyNeedsReorder) {
      recommendations = recommendations.filter((item) => item.shouldReorder);
    }

    recommendations = recommendations
      .sort((a, b) => {
        const urgencyDiff =
          this.getUrgencyRank(b.urgency) - this.getUrgencyRank(a.urgency);
        if (urgencyDiff !== 0) {
          return urgencyDiff;
        }

        return (
          b.recommendedOrderQuantity - a.recommendedOrderQuantity ||
          b.reorderPoint - b.currentStock - (a.reorderPoint - a.currentStock)
        );
      })
      .slice(0, filters.limit ?? 50);

    return {
      period: forecast.period,
      model: forecast.model,
      parameters: {
        leadTimeDays,
        reviewPeriodDays,
        serviceLevel,
        serviceLevelZScore,
      },
      totals: {
        productsAnalyzed: forecast.data.length,
        productsNeedingReorder: allRecommendations.filter(
          (item) => item.shouldReorder,
        ).length,
        recommendedUnits: allRecommendations.reduce(
          (sum, item) => sum + item.recommendedOrderQuantity,
          0,
        ),
        estimatedCost: this.round2(
          allRecommendations.reduce(
            (sum, item) => sum + item.estimatedOrderCost,
            0,
          ),
        ),
      },
      data: recommendations,
    };
  }

  private async tryGetMlForecasts(
    products: ProductDemandForecast[],
    filters: NormalizedForecastFilters,
  ): Promise<MlForecastResult | null> {
    const mlForecastUrl = this.getMlForecastUrl();
    if (!mlForecastUrl || products.length === 0) {
      return null;
    }

    const requestBody: MlForecastRequest = {
      forecastDays: filters.forecastDays,
      products: products.map((product) => ({
        productId: product.productId,
        productCode: product.productCode,
        productName: product.productName,
        history: product.history ?? [],
      })),
    };
    const abortController = new AbortController();
    const timeout = setTimeout(() => {
      abortController.abort();
    }, this.getMlForecastTimeoutMs());

    try {
      const response = await fetch(mlForecastUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as MlForecastResponse;
      return this.mapMlForecastResponse(payload, filters.forecastDays);
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapMlForecastResponse(
    payload: MlForecastResponse,
    forecastDays: number,
  ): MlForecastResult | null {
    if (!payload.data?.length) {
      return null;
    }

    const forecastsByProductId = new Map<
      number,
      {
        forecast: ForecastPoint[];
        confidence?: ForecastConfidence;
      }
    >();

    for (const productForecast of payload.data) {
      const forecast = productForecast.forecast
        .map((point) => this.mapMlForecastPoint(point))
        .filter((point): point is ForecastPoint => point !== null);

      if (forecast.length === forecastDays) {
        forecastsByProductId.set(productForecast.productId, {
          forecast,
          confidence: productForecast.metrics?.confidence,
        });
      }
    }

    if (forecastsByProductId.size === 0) {
      return null;
    }

    return {
      model: {
        name: payload.model?.name?.trim() || 'prophet',
        granularity: 'day',
        description:
          payload.model?.description?.trim() ||
          'Prophet entrenado por producto desde ventas historicas.',
      },
      forecastsByProductId,
    };
  }

  private mapMlForecastPoint(point: MlForecastPoint): ForecastPoint | null {
    const date = point.date?.slice(0, 10);
    if (!date) {
      return null;
    }

    const predictedQuantity = this.round2(
      Math.max(0, this.toNumber(point.predictedQuantity)),
    );
    const lowerBound = this.round2(
      Math.max(0, this.toNumber(point.lowerBound)),
    );
    const upperBound = this.round2(
      Math.max(predictedQuantity, this.toNumber(point.upperBound)),
    );

    return {
      date,
      predictedQuantity,
      lowerBound: Math.min(lowerBound, predictedQuantity),
      upperBound,
    };
  }

  private applyMlForecasts(
    products: ProductDemandForecast[],
    mlForecastResult: MlForecastResult,
    filters: NormalizedForecastFilters,
  ): ProductDemandForecast[] {
    return products.map((product) => {
      const mlForecast = mlForecastResult.forecastsByProductId.get(
        product.productId,
      );

      if (!mlForecast) {
        return product;
      }

      const forecast = mlForecast.forecast.slice(0, filters.forecastDays);
      const projectedDemand = this.round2(
        forecast.reduce((sum, point) => sum + point.predictedQuantity, 0),
      );

      return {
        ...product,
        forecast,
        summary: {
          ...product.summary,
          projectedDemand,
          projectedAverageDailyDemand: this.round2(
            projectedDemand / Math.max(1, filters.forecastDays),
          ),
          confidence: mlForecast.confidence ?? product.summary.confidence,
        },
      };
    });
  }

  private applyHistoryPreference(
    products: ProductDemandForecast[],
    includeHistory: boolean,
  ): ProductDemandForecast[] {
    if (includeHistory) {
      return products;
    }

    return products.map((product) => ({
      ...product,
      history: undefined,
    }));
  }

  private resolveResponseModel(
    mlForecastResult: MlForecastResult | null,
    productsCount: number,
  ): DemandForecastResponse['model'] {
    if (!mlForecastResult) {
      return LOCAL_FORECAST_MODEL;
    }

    if (mlForecastResult.forecastsByProductId.size === productsCount) {
      return mlForecastResult.model;
    }

    return {
      ...mlForecastResult.model,
      name: `${mlForecastResult.model.name}-partial-local-fallback`,
      description: `${mlForecastResult.model.description} Algunos productos usaron el baseline local por falta de respuesta valida del servicio ML.`,
    };
  }

  private normalizeForecastFilters(
    filters: DemandForecastQueryDto,
  ): NormalizedForecastFilters {
    const requestedHistoryDays = filters.historyDays ?? 180;
    const forecastDays = filters.forecastDays ?? 30;
    const today = this.getCurrentLocalDate();
    const endDate = filters.endDate ?? today;
    const startDate =
      filters.startDate ?? this.addDays(endDate, -(requestedHistoryDays - 1));

    assertDateRange(
      startDate,
      endDate,
      'startDate no puede ser mayor que endDate',
    );

    const historyDays = calculateInclusiveDays(startDate, endDate);
    if (historyDays < 14) {
      throw new BadRequestException(
        'El rango historico debe tener al menos 14 dias',
      );
    }

    const forecastStartDate = this.addDays(endDate, 1);

    return {
      startDate,
      endDate,
      historyDays,
      forecastStartDate,
      forecastEndDate: this.addDays(forecastStartDate, forecastDays - 1),
      forecastDays,
      includeHistory: filters.includeHistory ?? false,
    };
  }

  private async findForecastProducts(
    filters: DemandForecastQueryDto,
    user: AuthenticatedUser,
  ): Promise<ForecastProduct[]> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .select('p.id', 'productId')
      .addSelect('p.code', 'productCode')
      .addSelect('p.name', 'productName')
      .addSelect('p.type_id', 'typeId')
      .addSelect('p.stock', 'currentStock')
      .addSelect('p.min_stock', 'minStock')
      .addSelect('p.cost', 'unitCost')
      .where('p.company_id = :companyId', { companyId: user.companyId })
      .orderBy('p.name', 'ASC')
      .addOrderBy('p.id', 'ASC');

    if (this.isRestrictedUser(user)) {
      qb.andWhere('p.user_id = :userId', { userId: user.id });
    }

    if (filters.productId) {
      qb.andWhere('p.id = :productId', { productId: filters.productId });
    }

    if (filters.typeId) {
      qb.andWhere('p.type_id = :typeId', { typeId: filters.typeId });
    }

    const rows = await qb.getRawMany<RawForecastProduct>();
    return rows.map((row) => ({
      productId: this.toNumber(row.productId),
      productCode: row.productCode?.trim() || `#${row.productId}`,
      productName: row.productName?.trim() || `Producto ${row.productId}`,
      typeId: this.toNumber(row.typeId),
      currentStock: this.toNumber(row.currentStock),
      minStock: this.toNumber(row.minStock),
      unitCost: this.toNumber(row.unitCost),
    }));
  }

  private async findDemandRows(
    productIds: number[],
    filters: NormalizedForecastFilters,
    user: AuthenticatedUser,
  ): Promise<RawDemandRow[]> {
    if (productIds.length === 0) {
      return [];
    }

    const qb = this.itemRepo
      .createQueryBuilder('item')
      .innerJoin(Invoice, 'inv', 'inv.id = item.invoice_id')
      .select('item.product_id', 'productId')
      .addSelect(`TO_CHAR(inv.issue_date, 'YYYY-MM-DD')`, 'date')
      .addSelect('COALESCE(SUM(item.quantity), 0)', 'quantity')
      .where('inv.company_id = :companyId', { companyId: user.companyId })
      .andWhere('inv.invoice_type = :invoiceType', {
        invoiceType: InvoiceType.VENTA,
      })
      .andWhere('inv.status <> :cancelledStatus', {
        cancelledStatus: InvoiceStatus.ANULADA,
      })
      .andWhere('inv.issue_date >= :startDate', {
        startDate: filters.startDate,
      })
      .andWhere('inv.issue_date <= :endDate', { endDate: filters.endDate })
      .andWhere('item.product_id IN (:...productIds)', { productIds })
      .groupBy('item.product_id')
      .addGroupBy('inv.issue_date')
      .orderBy('item.product_id', 'ASC')
      .addOrderBy('inv.issue_date', 'ASC');

    if (this.isRestrictedUser(user)) {
      qb.andWhere('inv.user_id = :userId', { userId: user.id });
    }

    return qb.getRawMany<RawDemandRow>();
  }

  private buildDemandMap(
    rows: RawDemandRow[],
  ): Map<number, Map<string, number>> {
    const demandByProduct = new Map<number, Map<string, number>>();

    for (const row of rows) {
      const productId = this.toNumber(row.productId);
      const date = row.date;
      const quantity = this.toNumber(row.quantity);

      if (!demandByProduct.has(productId)) {
        demandByProduct.set(productId, new Map<string, number>());
      }

      demandByProduct.get(productId)?.set(date, quantity);
    }

    return demandByProduct;
  }

  private buildProductForecast(
    product: ForecastProduct,
    historyDates: string[],
    demandByDate: Map<string, number>,
    filters: NormalizedForecastFilters,
  ): ProductDemandForecast {
    const history = historyDates.map((date) => ({
      date,
      quantity: demandByDate.get(date) ?? 0,
    }));
    const stats = this.calculateDemandStats(history);
    const forecast = this.buildForecastPoints(
      filters.forecastStartDate,
      filters.forecastDays,
      stats,
    );
    const projectedDemand = this.round2(
      forecast.reduce((sum, point) => sum + point.predictedQuantity, 0),
    );

    return {
      productId: product.productId,
      productCode: product.productCode,
      productName: product.productName,
      typeId: product.typeId,
      currentStock: product.currentStock,
      minStock: product.minStock,
      unitCost: product.unitCost,
      history: filters.includeHistory ? history : undefined,
      forecast,
      summary: {
        historicalTotal: stats.historicalTotal,
        historicalAverageDailyDemand: stats.averageDailyDemand,
        recentAverageDailyDemand: stats.recentAverageDailyDemand,
        projectedDemand,
        projectedAverageDailyDemand: this.round2(
          projectedDemand / Math.max(1, filters.forecastDays),
        ),
        peakDailyDemand: stats.peakDailyDemand,
        demandStdDev: stats.demandStdDev,
        activeDemandDays: stats.activeDemandDays,
        confidence: stats.confidence,
      },
    };
  }

  private calculateDemandStats(history: DemandPoint[]): DemandStats {
    const quantities = history.map((point) => point.quantity);
    const days = Math.max(1, quantities.length);
    const historicalTotal = quantities.reduce(
      (sum, quantity) => sum + quantity,
      0,
    );
    const averageDailyDemand = historicalTotal / days;
    const demandStdDev = this.standardDeviation(quantities, averageDailyDemand);
    const coefficientOfVariation =
      averageDailyDemand > 0 ? demandStdDev / averageDailyDemand : 0;
    const activeDemandDays = quantities.filter(
      (quantity) => quantity > 0,
    ).length;
    const recentWindow = Math.min(days, Math.max(7, Math.floor(days / 3)));
    const recentAverageDailyDemand = this.average(
      quantities.slice(Math.max(0, days - recentWindow)),
    );
    const firstHalf = quantities.slice(0, Math.floor(days / 2));
    const secondHalf = quantities.slice(Math.floor(days / 2));
    const rawTrend =
      (this.average(secondHalf) - this.average(firstHalf)) /
      Math.max(1, Math.floor(days / 2));
    const trendLimit = Math.max(0.05, Math.abs(averageDailyDemand) * 0.05);
    const baselineDailyDemand = this.calculateWeightedBaseline(quantities);
    const trendPerDay = this.clamp(rawTrend, -trendLimit, trendLimit);
    const seasonalFactors = this.calculateWeeklySeasonality(
      history,
      averageDailyDemand,
      activeDemandDays,
    );
    const mae = this.calculateMae(
      history,
      baselineDailyDemand,
      seasonalFactors,
    );
    const peakDailyDemand = Math.max(0, ...quantities);
    const confidence = this.classifyConfidence(
      days,
      historicalTotal,
      activeDemandDays,
      coefficientOfVariation,
    );

    return {
      historicalTotal: this.round2(historicalTotal),
      averageDailyDemand: this.round2(averageDailyDemand),
      recentAverageDailyDemand: this.round2(recentAverageDailyDemand),
      demandStdDev: this.round2(demandStdDev),
      coefficientOfVariation: this.round2(coefficientOfVariation),
      peakDailyDemand,
      activeDemandDays,
      baselineDailyDemand,
      trendPerDay,
      seasonalFactors,
      mae,
      confidence,
    };
  }

  private buildForecastPoints(
    forecastStartDate: string,
    forecastDays: number,
    stats: DemandStats,
  ): ForecastPoint[] {
    return Array.from({ length: forecastDays }, (_, index) => {
      const date = this.addDays(forecastStartDate, index);
      const dayOfWeek = this.getDayOfWeek(date);
      const trendAdjustedBaseline =
        stats.baselineDailyDemand + stats.trendPerDay * (index + 1);
      const predictedQuantity = Math.max(
        0,
        trendAdjustedBaseline * stats.seasonalFactors[dayOfWeek],
      );
      const errorBand = Math.max(
        stats.mae,
        stats.demandStdDev * 0.75,
        predictedQuantity * 0.2,
      );

      return {
        date,
        predictedQuantity: this.round2(predictedQuantity),
        lowerBound: this.round2(Math.max(0, predictedQuantity - errorBand)),
        upperBound: this.round2(predictedQuantity + errorBand),
      };
    });
  }

  private buildReplenishmentRecommendation(
    item: ProductDemandForecast,
    leadTimeDays: number,
    reviewPeriodDays: number,
    serviceLevelZScore: number,
  ): ReplenishmentRecommendation {
    const demandDuringLeadTime = this.sumForecast(item.forecast, leadTimeDays);
    const demandDuringReviewPeriod = this.sumForecast(
      item.forecast.slice(leadTimeDays),
      reviewPeriodDays,
    );
    const projectedDemandUntilNextReview = this.round2(
      demandDuringLeadTime + demandDuringReviewPeriod,
    );
    const safetyStock = Math.ceil(
      serviceLevelZScore *
        item.summary.demandStdDev *
        Math.sqrt(Math.max(1, leadTimeDays)),
    );
    const reorderPoint = Math.max(
      item.minStock,
      Math.ceil(demandDuringLeadTime + safetyStock),
    );
    const targetStock = Math.max(
      item.minStock,
      Math.ceil(projectedDemandUntilNextReview + safetyStock),
    );
    const projectedStockAfterLeadTime = this.round2(
      item.currentStock - demandDuringLeadTime,
    );
    const shouldReorder =
      item.currentStock <= item.minStock ||
      item.currentStock <= reorderPoint ||
      projectedStockAfterLeadTime <= safetyStock;
    const recommendedOrderQuantity = shouldReorder
      ? Math.max(0, targetStock - item.currentStock)
      : 0;
    const stockout = this.findExpectedStockout(
      item.currentStock,
      item.forecast,
    );
    const urgency = this.resolveUrgency(
      item,
      shouldReorder,
      stockout.daysUntilStockout,
      leadTimeDays,
      projectedStockAfterLeadTime,
    );
    const estimatedOrderCost = this.round2(
      recommendedOrderQuantity * item.unitCost,
    );

    return {
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      typeId: item.typeId,
      currentStock: item.currentStock,
      minStock: item.minStock,
      leadTimeDays,
      reviewPeriodDays,
      forecast: {
        demandDuringLeadTime,
        demandDuringReviewPeriod,
        projectedDemandUntilNextReview,
        projectedAverageDailyDemand: item.summary.projectedAverageDailyDemand,
        confidence: item.summary.confidence,
      },
      safetyStock,
      reorderPoint,
      targetStock,
      recommendedOrderQuantity,
      estimatedOrderCost,
      shouldReorder,
      urgency,
      expectedStockoutDate: stockout.expectedStockoutDate,
      daysUntilStockout: stockout.daysUntilStockout,
      reasons: this.buildRecommendationReasons(
        item,
        shouldReorder,
        reorderPoint,
        safetyStock,
        stockout.daysUntilStockout,
        leadTimeDays,
      ),
    };
  }

  private buildRecommendationReasons(
    item: ProductDemandForecast,
    shouldReorder: boolean,
    reorderPoint: number,
    safetyStock: number,
    daysUntilStockout: number | null,
    leadTimeDays: number,
  ): string[] {
    if (!shouldReorder) {
      return ['Stock suficiente para el lead time configurado'];
    }

    const reasons: string[] = [];

    if (item.currentStock <= 0) {
      reasons.push('Stock actual agotado');
    }

    if (item.currentStock <= item.minStock) {
      reasons.push(
        `Stock actual (${item.currentStock}) por debajo del minimo (${item.minStock})`,
      );
    }

    if (item.currentStock <= reorderPoint) {
      reasons.push(
        `Stock actual (${item.currentStock}) por debajo del punto de reorden (${reorderPoint})`,
      );
    }

    if (daysUntilStockout !== null && daysUntilStockout <= leadTimeDays) {
      reasons.push(
        `Riesgo de quiebre antes de recibir al proveedor (${daysUntilStockout} dias)`,
      );
    }

    if (safetyStock > 0) {
      reasons.push(`Stock de seguridad sugerido: ${safetyStock} unidades`);
    }

    return reasons;
  }

  private resolveUrgency(
    item: ProductDemandForecast,
    shouldReorder: boolean,
    daysUntilStockout: number | null,
    leadTimeDays: number,
    projectedStockAfterLeadTime: number,
  ): ReplenishmentUrgency {
    if (item.currentStock <= 0) {
      return 'critica';
    }

    if (daysUntilStockout !== null && daysUntilStockout <= leadTimeDays) {
      return 'critica';
    }

    if (
      projectedStockAfterLeadTime <= 0 ||
      item.currentStock <= item.minStock
    ) {
      return 'alta';
    }

    if (shouldReorder) {
      return 'media';
    }

    return 'normal';
  }

  private findExpectedStockout(
    currentStock: number,
    forecast: ForecastPoint[],
  ): { expectedStockoutDate: string | null; daysUntilStockout: number | null } {
    if (currentStock <= 0) {
      return {
        expectedStockoutDate: forecast[0]?.date ?? this.getCurrentLocalDate(),
        daysUntilStockout: 0,
      };
    }

    let remainingStock = currentStock;

    for (let index = 0; index < forecast.length; index += 1) {
      remainingStock -= forecast[index].predictedQuantity;

      if (remainingStock <= 0) {
        return {
          expectedStockoutDate: forecast[index].date,
          daysUntilStockout: index + 1,
        };
      }
    }

    return {
      expectedStockoutDate: null,
      daysUntilStockout: null,
    };
  }

  private sumForecast(forecast: ForecastPoint[], days: number): number {
    return this.round2(
      forecast
        .slice(0, days)
        .reduce((sum, point) => sum + point.predictedQuantity, 0),
    );
  }

  private calculateWeightedBaseline(quantities: number[]): number {
    const windows = [
      { size: 7, weight: 0.5 },
      { size: 30, weight: 0.3 },
      { size: 90, weight: 0.2 },
    ];
    let weightedTotal = 0;
    let weightTotal = 0;

    for (const window of windows) {
      if (quantities.length >= window.size) {
        weightedTotal +=
          this.average(quantities.slice(quantities.length - window.size)) *
          window.weight;
        weightTotal += window.weight;
      }
    }

    if (weightTotal === 0) {
      return this.average(quantities);
    }

    return weightedTotal / weightTotal;
  }

  private calculateWeeklySeasonality(
    history: DemandPoint[],
    averageDailyDemand: number,
    activeDemandDays: number,
  ): number[] {
    if (
      history.length < 28 ||
      averageDailyDemand <= 0 ||
      activeDemandDays < 4
    ) {
      return [1, 1, 1, 1, 1, 1, 1];
    }

    return Array.from({ length: 7 }, (_, dayOfWeek) => {
      const quantities = history
        .filter((point) => this.getDayOfWeek(point.date) === dayOfWeek)
        .map((point) => point.quantity);
      const factor = this.average(quantities) / averageDailyDemand;
      return this.clamp(factor, 0.5, 1.5);
    });
  }

  private calculateMae(
    history: DemandPoint[],
    baselineDailyDemand: number,
    seasonalFactors: number[],
  ): number {
    if (history.length === 0) {
      return 0;
    }

    const errorTotal = history.reduce((sum, point) => {
      const fitted =
        baselineDailyDemand * seasonalFactors[this.getDayOfWeek(point.date)];
      return sum + Math.abs(point.quantity - fitted);
    }, 0);

    return errorTotal / history.length;
  }

  private classifyConfidence(
    historyDays: number,
    historicalTotal: number,
    activeDemandDays: number,
    coefficientOfVariation: number,
  ): ForecastConfidence {
    if (historicalTotal <= 0 || activeDemandDays === 0) {
      return 'sin_historial';
    }

    if (historyDays < 30 || activeDemandDays < 3) {
      return 'baja';
    }

    if (
      historyDays < 90 ||
      activeDemandDays < 8 ||
      coefficientOfVariation > 1.25
    ) {
      return 'media';
    }

    return 'alta';
  }

  private getServiceLevelZScore(serviceLevel: number): number {
    if (serviceLevel >= 0.99) {
      return 2.33;
    }

    if (serviceLevel >= 0.98) {
      return 2.05;
    }

    if (serviceLevel >= 0.95) {
      return 1.65;
    }

    if (serviceLevel >= 0.9) {
      return 1.28;
    }

    if (serviceLevel >= 0.85) {
      return 1.04;
    }

    if (serviceLevel >= 0.8) {
      return 0.84;
    }

    return 0.67;
  }

  private getUrgencyRank(urgency: ReplenishmentUrgency): number {
    const ranks: Record<ReplenishmentUrgency, number> = {
      critica: 4,
      alta: 3,
      media: 2,
      normal: 1,
    };

    return ranks[urgency];
  }

  private standardDeviation(values: number[], average: number): number {
    if (values.length === 0) {
      return 0;
    }

    const variance =
      values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
      values.length;

    return Math.sqrt(variance);
  }

  private average(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private buildDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    let cursor = this.parseDateOnly(startDate);
    const end = this.parseDateOnly(endDate);

    while (cursor.getTime() <= end.getTime()) {
      dates.push(this.formatDateToYmd(cursor));
      cursor = this.addDaysToDate(cursor, 1);
    }

    return dates;
  }

  private addDays(ymd: string, daysToAdd: number): string {
    return this.formatDateToYmd(
      this.addDaysToDate(this.parseDateOnly(ymd), daysToAdd),
    );
  }

  private addDaysToDate(date: Date, daysToAdd: number): Date {
    const nextDate = new Date(date.getTime());
    nextDate.setUTCDate(nextDate.getUTCDate() + daysToAdd);
    return nextDate;
  }

  private getDayOfWeek(ymd: string): number {
    return this.parseDateOnly(ymd).getUTCDay();
  }

  private parseDateOnly(ymd: string): Date {
    const [year, month, day] = ymd.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  private getCurrentLocalDate(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    return `${year}-${month}-${day}`;
  }

  private formatDateToYmd(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private toNumber(value: string | number | null | undefined): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private isRestrictedUser(user: AuthenticatedUser): boolean {
    return user.role === 2;
  }

  private getMlForecastUrl(): string | null {
    const configuredUrl = this.configService.get<string>('ML_FORECAST_URL');
    if (!configuredUrl) {
      return null;
    }

    const trimmedUrl = configuredUrl.trim();

    if (
      !trimmedUrl ||
      ['disabled', 'false', 'off'].includes(trimmedUrl.toLowerCase())
    ) {
      return null;
    }

    try {
      const normalizedUrl = trimmedUrl.endsWith('/')
        ? trimmedUrl
        : `${trimmedUrl}/`;
      return new URL('forecast', normalizedUrl).toString();
    } catch {
      return null;
    }
  }

  private getMlForecastTimeoutMs(): number {
    const configuredTimeout = Number(
      this.configService.get<string | number>(
        'ML_FORECAST_TIMEOUT_MS',
        DEFAULT_ML_FORECAST_TIMEOUT_MS,
      ),
    );

    if (!Number.isFinite(configuredTimeout)) {
      return DEFAULT_ML_FORECAST_TIMEOUT_MS;
    }

    return Math.max(1000, configuredTimeout);
  }
}
