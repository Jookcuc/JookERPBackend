import { Controller, Get, Post, Patch, Delete, Body, Query, Param, ParseIntPipe, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { FilterInvoiceDto } from './dto/filter-invoice.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { FilterContactDto } from './dto/filter-contact.dto';
import { InvoiceType } from './entities/invoice.entity';

@ApiTags('Invoices')
@ApiBearerAuth('JWT-auth')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // ─── FACTURAS ────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Crear factura de compra o venta' })
  @ApiResponse({ status: 201, description: 'Factura creada, stock actualizado automáticamente' })
  @ApiResponse({ status: 400, description: 'Stock insuficiente' })
  @ApiResponse({ status: 409, description: 'Número de factura duplicado' })
  create(@Body() dto: CreateInvoiceDto, @Request() req) {
    return this.invoicesService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar facturas con filtros' })
  findAll(@Query() filters: FilterInvoiceDto, @Request() req) {
    return this.invoicesService.findAll(filters, req.user);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Calendario de vencimientos' })
  @ApiQuery({ name: 'invoiceType', enum: InvoiceType, required: false })
  @ApiQuery({ name: 'startDate', required: false, example: '2025-07-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2025-07-31' })
  getCalendar(
    @Request() req,
    @Query('invoiceType') invoiceType?: InvoiceType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.invoicesService.getCalendar(req.user, invoiceType, startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener factura por ID' })
  @ApiParam({ name: 'id', example: 1 })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.invoicesService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar factura' })
  @ApiParam({ name: 'id', example: 1 })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInvoiceDto, @Request() req) {
    return this.invoicesService.update(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar factura' })
  @ApiParam({ name: 'id', example: 1 })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.invoicesService.remove(id, req.user);
  }

  // ─── CONTACTOS ───────────────────────────────────────────────

  @Post('contacts')
  @ApiOperation({ summary: 'Crear proveedor o cliente' })
  createContact(@Body() dto: CreateContactDto, @Request() req) {
    return this.invoicesService.createContact(dto, req.user);
  }

  @Get('contacts')
  @ApiOperation({ summary: 'Listar contactos con filtros' })
  findAllContacts(@Query() filters: FilterContactDto, @Request() req) {
    return this.invoicesService.findAllContacts(filters, req.user);
  }

  @Patch('contacts/:id')
  @ApiOperation({ summary: 'Editar contacto' })
  @ApiParam({ name: 'id', example: 1 })
  updateContact(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContactDto, @Request() req) {
    return this.invoicesService.updateContact(id, dto, req.user);
  }

  @Delete('contacts/:id')
  @ApiOperation({ summary: 'Eliminar contacto' })
  @ApiParam({ name: 'id', example: 1 })
  removeContact(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.invoicesService.removeContact(id, req.user);
  }
}