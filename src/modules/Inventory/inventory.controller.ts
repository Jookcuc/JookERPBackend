import { Controller, Get, Post, Patch, Delete, Body, Query, Param, ParseIntPipe, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { FilterProductTypeDto } from './dto/filter-product-type.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';

@ApiTags('Inventory')
@ApiBearerAuth('JWT-auth')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ─── TIPOS ───────────────────────────────────────────────────

  @Post('types')
  @ApiOperation({ summary: 'Crear categoría' })
  @ApiResponse({ status: 201, description: 'Tipo creado exitosamente' })
  @ApiResponse({ status: 409, description: 'El código ya existe' })
  createType(@Body() dto: CreateProductTypeDto, @Request() req) {
    return this.inventoryService.createType(dto, req.user);
  }

  @Get('types')
  @ApiOperation({ summary: 'Listar categorías con filtros' })
  @ApiResponse({ status: 200, description: 'Lista de tipos con totalStock' })
  findAllTypes(@Query() filters: FilterProductTypeDto, @Request() req) {
    return this.inventoryService.findAllTypes(filters, req.user);
  }

  @Get('types-list')
  @ApiOperation({ summary: 'Listar categorías (solo id y name) sin paginación' })
  @ApiResponse({ status: 200, description: 'Lista simple de tipos' })
  findAllTypesList(@Request() req) {
    return this.inventoryService.findAllTypesList(req.user);
  }

  @Patch('types/:id')
  @ApiOperation({ summary: 'Editar categoría' })
  @ApiParam({ name: 'id', example: 1 })
  updateType(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductTypeDto, @Request() req) {
    return this.inventoryService.updateType(id, dto, req.user);
  }

  @Delete('types/:id')
  @ApiOperation({ summary: 'Eliminar categoría' })
  @ApiParam({ name: 'id', example: 1 })
  removeType(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.inventoryService.removeType(id, req.user);
  }

  // ─── PRODUCTOS ───────────────────────────────────────────────

  @Post('products')
  @ApiOperation({ summary: 'Crear producto' })
  @ApiResponse({ status: 201, description: 'Producto creado exitosamente' })
  createProduct(@Body() dto: CreateProductDto, @Request() req) {
    return this.inventoryService.createProduct(dto, req.user);
  }

  @Get('products')
  @ApiOperation({ summary: 'Listar productos + KPIs' })
  @ApiResponse({ status: 200, description: 'Lista de productos y cards del inventario' })
  findAllProducts(@Query() filters: FilterProductDto, @Request() req) {
    return this.inventoryService.findAllProducts(filters, req.user);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Editar producto' })
  @ApiParam({ name: 'id', example: 1 })
  updateProduct(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto, @Request() req) {
    return this.inventoryService.updateProduct(id, dto, req.user);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Eliminar producto' })
  @ApiParam({ name: 'id', example: 1 })
  removeProduct(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.inventoryService.removeProduct(id, req.user);
  }
}