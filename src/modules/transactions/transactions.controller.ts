import { Controller, Get, Post, Body, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';

@ApiTags('Transactions')
@ApiBearerAuth('JWT-auth')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('adjustment')
  @ApiOperation({ summary: 'Añadir un ajuste manual a transacciones' })
  @ApiResponse({ status: 201, description: 'Ajuste creado exitosamente' })
  createAdjustment(@Body() dto: CreateTransactionDto, @Request() req) {
    return this.transactionsService.createAdjustment(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar transacciones con totales' })
  findAll(@Query() filters: FilterTransactionDto, @Request() req) {
    return this.transactionsService.findAll(filters, req.user);
  }
}
