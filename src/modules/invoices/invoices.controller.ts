import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CalendarInvoiceFilterDto } from './dto/calendar-invoice-filter.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { CreateSalesInvoiceDto } from './dto/create-sales-invoice.dto';
import { FilterContactDto } from './dto/filter-contact.dto';
import { FilterInvoiceDto } from './dto/filter-invoice.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceType } from './entities/invoice.entity';
import {
  InvoicesService,
  type SalesInvoicePdfResponse,
} from './invoices.service';

@ApiTags('Invoices')
@ApiBearerAuth('JWT-auth')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('sales')
  @ApiOperation({ summary: 'Crear factura de venta' })
  @ApiResponse({
    status: 201,
    description: 'Factura de venta creada y stock actualizado automaticamente',
  })
  @ApiResponse({ status: 400, description: 'Stock insuficiente' })
  @ApiResponse({ status: 409, description: 'Numero de factura duplicado' })
  createSales(@Body() dto: CreateSalesInvoiceDto, @Request() req) {
    return this.invoicesService.createSales(dto, req.user);
  }

  @Post('purchases')
  @ApiOperation({ summary: 'Crear factura de compra' })
  @ApiResponse({
    status: 201,
    description: 'Factura de compra creada y stock actualizado automaticamente',
  })
  @ApiResponse({ status: 409, description: 'Numero de factura duplicado' })
  createPurchase(@Body() dto: CreatePurchaseInvoiceDto, @Request() req) {
    return this.invoicesService.createPurchase(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar facturas con filtros' })
  findAll(@Query() filters: FilterInvoiceDto, @Request() req) {
    return this.invoicesService.findAll(filters, req.user);
  }

  @Get('sales')
  @ApiOperation({ summary: 'Listar facturas de venta' })
  findSales(@Query() filters: FilterInvoiceDto, @Request() req) {
    return this.invoicesService.findAll(
      { ...filters, invoiceType: InvoiceType.VENTA },
      req.user,
    );
  }

  @Get('purchases')
  @ApiOperation({ summary: 'Listar facturas de compra' })
  findPurchases(@Query() filters: FilterInvoiceDto, @Request() req) {
    return this.invoicesService.findAll(
      { ...filters, invoiceType: InvoiceType.COMPRA },
      req.user,
    );
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Calendario de vencimientos' })
  getCalendar(@Request() req, @Query() filters: CalendarInvoiceFilterDto) {
    return this.invoicesService.getCalendar(req.user, filters);
  }

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
  updateContact(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContactDto,
    @Request() req,
  ) {
    return this.invoicesService.updateContact(id, dto, req.user);
  }

  @Delete('contacts/:id')
  @ApiOperation({ summary: 'Eliminar contacto' })
  @ApiParam({ name: 'id', example: 1 })
  removeContact(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.invoicesService.removeContact(id, req.user);
  }

  @Get(':id/download-pdf')
  @ApiOperation({
    summary:
      'Generar PDF de una factura de venta, guardarlo en S3 y retornar URL de descarga',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Retorna la URL firmada para descargar el PDF de la factura',
  })
  downloadSalesInvoicePdf(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<SalesInvoicePdfResponse> {
    return this.invoicesService.downloadSalesInvoicePdf(id, req.user);
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
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInvoiceDto,
    @Request() req,
  ) {
    return this.invoicesService.update(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar factura' })
  @ApiParam({ name: 'id', example: 1 })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.invoicesService.remove(id, req.user);
  }
}
