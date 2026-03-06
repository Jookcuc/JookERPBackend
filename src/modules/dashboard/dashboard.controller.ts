import { Controller, Get, Query, Request } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import { TopProductsFilterDto } from './dto/top-products-filter.dto';
import type {
  DashboardChartsResponse,
  DashboardOverviewResponse,
  DashboardTopProductsResponse,
} from './dashboard.service';
import { DashboardService } from './dashboard.service';

interface AuthenticatedUser {
  id: number;
  role: number;
  companyId: number;
}

type RequestWithUser = ExpressRequest & {
  user: AuthenticatedUser;
};

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Resumen general para cards y alertas del dashboard',
  })
  @ApiResponse({
    status: 200,
    description:
      'Retorna KPIs financieros, facturas, inventario y alertas operativas',
  })
  getOverview(
    @Query() filters: DashboardFilterDto,
    @Request() req: RequestWithUser,
  ): Promise<DashboardOverviewResponse> {
    return this.dashboardService.getOverview(filters, req.user);
  }

  @Get('charts')
  @ApiOperation({
    summary: 'Series para graficos del dashboard',
  })
  @ApiResponse({
    status: 200,
    description:
      'Retorna series de flujo de caja, ventas/compras y distribuciones',
  })
  getCharts(
    @Query() filters: DashboardFilterDto,
    @Request() req: RequestWithUser,
  ): Promise<DashboardChartsResponse> {
    return this.dashboardService.getCharts(filters, req.user);
  }

  @Get('top-products')
  @ApiOperation({
    summary: 'Top de productos vendidos',
  })
  @ApiResponse({
    status: 200,
    description:
      'Retorna ranking de productos por cantidad o monto vendido en el periodo',
  })
  getTopProducts(
    @Query() filters: TopProductsFilterDto,
    @Request() req: RequestWithUser,
  ): Promise<DashboardTopProductsResponse> {
    return this.dashboardService.getTopProducts(filters, req.user);
  }
}
