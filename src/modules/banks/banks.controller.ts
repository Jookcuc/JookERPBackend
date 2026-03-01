import { Controller, Get, Post, Patch, Delete, Body, Query, Param, ParseIntPipe, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BanksService } from './banks.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';
import { FilterBankDto } from './dto/filter-bank.dto';

@ApiTags('Banks')
@ApiBearerAuth('JWT-auth')
@Controller('banks')
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  @Post()
  @ApiOperation({ summary: 'Crear banco' })
  @ApiResponse({ status: 201, description: 'Banco creado' })
  create(@Body() dto: CreateBankDto, @Request() req) {
    return this.banksService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar bancos' })
  findAll(@Query() filters: FilterBankDto, @Request() req) {
    return this.banksService.findAll(filters, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener banco por ID' })
  @ApiParam({ name: 'id', example: 1 })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.banksService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar banco' })
  @ApiParam({ name: 'id', example: 1 })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBankDto, @Request() req) {
    return this.banksService.update(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar banco' })
  @ApiParam({ name: 'id', example: 1 })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.banksService.remove(id, req.user);
  }
}
