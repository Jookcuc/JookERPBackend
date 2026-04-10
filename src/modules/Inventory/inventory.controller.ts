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
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { FilterDiscountDto } from './dto/filter-discount.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { FilterProductTypeDto } from './dto/filter-product-type.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@ApiBearerAuth('JWT-auth')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('types')
  @ApiOperation({ summary: 'Crear categoria' })
  @ApiResponse({ status: 201, description: 'Tipo creado exitosamente' })
  @ApiResponse({ status: 409, description: 'El codigo ya existe' })
  createType(@Body() dto: CreateProductTypeDto, @Request() req) {
    return this.inventoryService.createType(dto, req.user);
  }

  @Get('types')
  @ApiOperation({ summary: 'Listar categorias con filtros' })
  @ApiResponse({ status: 200, description: 'Lista de tipos con totalStock' })
  findAllTypes(@Query() filters: FilterProductTypeDto, @Request() req) {
    return this.inventoryService.findAllTypes(filters, req.user);
  }

  @Get('types-list')
  @ApiOperation({
    summary: 'Listar categorias (solo id y name) sin paginacion',
  })
  @ApiResponse({ status: 200, description: 'Lista simple de tipos' })
  findAllTypesList(@Request() req) {
    return this.inventoryService.findAllTypesList(req.user);
  }

  @Patch('types/:id')
  @ApiOperation({ summary: 'Editar categoria' })
  @ApiParam({ name: 'id', example: 1 })
  updateType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductTypeDto,
    @Request() req,
  ) {
    return this.inventoryService.updateType(id, dto, req.user);
  }

  @Delete('types/:id')
  @ApiOperation({ summary: 'Eliminar categoria' })
  @ApiParam({ name: 'id', example: 1 })
  removeType(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.inventoryService.removeType(id, req.user);
  }

  @Post('discounts')
  @ApiOperation({ summary: 'Crear descuento del catalogo' })
  @ApiResponse({ status: 201, description: 'Descuento creado exitosamente' })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un descuento con ese nombre',
  })
  createDiscount(@Body() dto: CreateDiscountDto, @Request() req) {
    return this.inventoryService.createDiscount(dto, req.user);
  }

  @Get('discounts')
  @ApiOperation({ summary: 'Listar descuentos con filtros' })
  @ApiResponse({ status: 200, description: 'Lista paginada de descuentos' })
  findAllDiscounts(@Query() filters: FilterDiscountDto, @Request() req) {
    return this.inventoryService.findAllDiscounts(filters, req.user);
  }

  @Get('discounts-list')
  @ApiOperation({
    summary: 'Listar descuentos activos para seleccion sin paginacion',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista simple de descuentos activos',
  })
  findAllDiscountsList(@Request() req) {
    return this.inventoryService.findAllDiscountsList(req.user);
  }

  @Get('discounts/:id')
  @ApiOperation({ summary: 'Obtener detalle de un descuento' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Detalle del descuento' })
  @ApiResponse({ status: 404, description: 'Descuento no encontrado' })
  findOneDiscount(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.inventoryService.findOneDiscount(id, req.user);
  }

  @Patch('discounts/:id')
  @ApiOperation({ summary: 'Editar descuento del catalogo' })
  @ApiParam({ name: 'id', example: 1 })
  updateDiscount(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDiscountDto,
    @Request() req,
  ) {
    return this.inventoryService.updateDiscount(id, dto, req.user);
  }

  @Delete('discounts/:id')
  @ApiOperation({ summary: 'Eliminar descuento del catalogo' })
  @ApiParam({ name: 'id', example: 1 })
  removeDiscount(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.inventoryService.removeDiscount(id, req.user);
  }

  @Post('products')
  @ApiOperation({ summary: 'Crear producto' })
  @ApiResponse({ status: 201, description: 'Producto creado exitosamente' })
  createProduct(@Body() dto: CreateProductDto, @Request() req) {
    return this.inventoryService.createProduct(dto, req.user);
  }

  @Get('products')
  @ApiOperation({ summary: 'Listar productos + KPIs' })
  @ApiResponse({
    status: 200,
    description: 'Lista de productos y cards del inventario',
  })
  findAllProducts(@Query() filters: FilterProductDto, @Request() req) {
    return this.inventoryService.findAllProducts(filters, req.user);
  }

  @Get('products-list')
  @ApiOperation({ summary: 'Listar productos (solo id y name) sin paginacion' })
  @ApiResponse({ status: 200, description: 'Lista simple de productos' })
  findAllProductsList(@Request() req) {
    return this.inventoryService.findAllProductsList(req.user);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Obtener detalle de un producto' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Detalle del producto' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  findOneProduct(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.inventoryService.findOneProduct(id, req.user);
  }

  @Get('products/:id/qrcode')
  @ApiOperation({ summary: 'Obtener QR del producto guardado en S3' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Codigo QR en Base64, URL del producto y enlaces en S3',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  getProductQr(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.inventoryService.getProductQr(id, req.user);
  }

  @Get('products/:id/qrcode/download')
  @ApiOperation({ summary: 'Descargar el QR del producto desde S3' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({
    status: 302,
    description: 'Redirige a una URL firmada de descarga del QR',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async downloadProductQr(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Res() response: Response,
  ) {
    const { downloadUrl } = await this.inventoryService.downloadProductQr(
      id,
      req.user,
    );

    return response.redirect(downloadUrl);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Editar producto' })
  @ApiParam({ name: 'id', example: 1 })
  updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @Request() req,
  ) {
    return this.inventoryService.updateProduct(id, dto, req.user);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Eliminar producto' })
  @ApiParam({ name: 'id', example: 1 })
  removeProduct(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.inventoryService.removeProduct(id, req.user);
  }
}
