import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CondominiumService } from '../services/condominium.service';
import { CreateCondominiumDto } from '../dto/create-condominium.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guard/jwt-auth.guard';

@ApiTags('Condominium Management')
@ApiBearerAuth('JWT-auth')
@Controller('condominiums')
@UseGuards(JwtAuthGuard)
export class CondominiumController {
  constructor(private readonly condominiumService: CondominiumService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new condominium' })
  async create(@Body() createDto: CreateCondominiumDto, @Request() req) {
    return await this.condominiumService.create(createDto, req.user.companyId);
  }

  @Get()
  @ApiOperation({ summary: 'List all condominiums for the company' })
  async findAll(@Request() req) {
    return await this.condominiumService.findAll(req.user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific condominium' })
  async findOne(@Param('id') id: string, @Request() req) {
    return await this.condominiumService.findOne(+id, req.user.companyId);
  }
}
