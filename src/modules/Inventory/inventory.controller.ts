import { Controller, Get, Post, Patch, Delete, Body, Query, Param, ParseIntPipe } from '@nestjs/common';
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
  createType(@Body() dto: CreateProductTypeDto) {
    return this.inventoryService.createType(dto);
  }

  @Get('types')
  @ApiOperation({ summary: 'Listar categorías con filtros' })
  @ApiResponse({ status: 200, description: 'Lista de tipos con totalStock' })
  findAllTypes(@Query() filters: FilterProductTypeDto) {
    return this.inventoryService.findAllTypes(filters);
  }

  @Patch('types/:id')
  @ApiOperation({ summary: 'Editar categoría' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Tipo actualizado' })
  @ApiResponse({ status: 404, description: 'Tipo no encontrado' })
  @ApiResponse({ status: 409, description: 'El código ya está en uso' })
  updateType(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductTypeDto) {
    return this.inventoryService.updateType(id, dto);
  }

  @Delete('types/:id')
  @ApiOperation({ summary: 'Eliminar categoría' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Tipo eliminado' })
  @ApiResponse({ status: 404, description: 'Tipo no encontrado' })
  @ApiResponse({ status: 409, description: 'Tiene productos asociados' })
  removeType(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.removeType(id);
  }

  // ─── PRODUCTOS ───────────────────────────────────────────────

  @Post('products')
  @ApiOperation({ summary: 'Crear producto' })
  @ApiResponse({ status: 201, description: 'Producto creado exitosamente' })
  @ApiResponse({ status: 404, description: 'El tipo indicado no existe' })
  @ApiResponse({ status: 409, description: 'El código ya existe' })
  createProduct(@Body() dto: CreateProductDto) {
    return this.inventoryService.createProduct(dto);
  }

  @Get('products')
  @ApiOperation({ summary: 'Listar productos + KPIs' })
  @ApiResponse({ status: 200, description: 'Lista de productos y cards del inventario' })
  findAllProducts(@Query() filters: FilterProductDto) {
    return this.inventoryService.findAllProducts(filters);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Editar producto' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Producto actualizado' })
  @ApiResponse({ status: 404, description: 'Producto o tipo no encontrado' })
  @ApiResponse({ status: 409, description: 'El código ya está en uso' })
  updateProduct(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.inventoryService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Eliminar producto' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Producto eliminado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  removeProduct(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.removeProduct(id);
  }
}