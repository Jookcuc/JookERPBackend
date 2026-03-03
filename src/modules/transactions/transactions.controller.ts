import { Body, Controller, Get, Post, Query, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ExportTransactionsDto } from './dto/export-transactions.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import type {
  AuthenticatedUser,
  TransactionExportResponse,
  TransactionFilterOptionsResponse,
  TransactionListResponse,
} from './transactions.service';
import { TransactionsService } from './transactions.service';

type RequestWithUser = ExpressRequest & {
  user: AuthenticatedUser;
};

@ApiTags('Transactions')
@ApiBearerAuth('JWT-auth')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('adjustment')
  @ApiOperation({ summary: 'Anadir un ajuste manual a transacciones' })
  @ApiResponse({ status: 201, description: 'Ajuste creado exitosamente' })
  createAdjustment(
    @Body() dto: CreateTransactionDto,
    @Request() req: RequestWithUser,
  ) {
    return this.transactionsService.createAdjustment(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar transacciones con totales' })
  findAll(
    @Query() filters: FilterTransactionDto,
    @Request() req: RequestWithUser,
  ): Promise<TransactionListResponse> {
    return this.transactionsService.findAll(filters, req.user);
  }

  @Get('filter-options')
  @ApiOperation({
    summary: 'Obtener opciones para filtros de movement, category y format',
  })
  @ApiResponse({
    status: 200,
    description: 'Retorna listas listas para selects del front',
  })
  getFilterOptions(
    @Request() req: RequestWithUser,
  ): Promise<TransactionFilterOptionsResponse> {
    return this.transactionsService.getFilterOptions(req.user);
  }

  @Get('export')
  @ApiOperation({
    summary:
      'Exportar todas las transacciones filtradas a PDF o Excel y guardarlas en S3',
  })
  @ApiResponse({
    status: 200,
    description: 'Retorna la URL firmada para descargar el archivo exportado',
  })
  export(
    @Query() query: ExportTransactionsDto,
    @Request() req: RequestWithUser,
  ): Promise<TransactionExportResponse> {
    return this.transactionsService.exportTransactions(query, req.user);
  }
}
