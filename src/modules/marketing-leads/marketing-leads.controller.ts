import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CreateMarketingLeadDto } from './dto/create-marketing-lead.dto';
import { DiscoverMarketingLeadsDto } from './dto/discover-marketing-leads.dto';
import { FilterMarketingLeadDto } from './dto/filter-marketing-lead.dto';
import { ImportMarketingLeadsDto } from './dto/import-marketing-leads.dto';
import { SendLeadInfoDto } from './dto/send-lead-info.dto';
import { UpdateMarketingLeadDto } from './dto/update-marketing-lead.dto';
import { MarketingLeadsService } from './marketing-leads.service';

@ApiTags('Marketing Leads')
@ApiBearerAuth('JWT-auth')
@Controller('marketing-leads')
export class MarketingLeadsController {
  constructor(private readonly marketingLeadsService: MarketingLeadsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear lead comercial' })
  create(@Body() dto: CreateMarketingLeadDto, @Request() req) {
    return this.marketingLeadsService.create(dto, req.user);
  }

  @Post('import')
  @ApiOperation({ summary: 'Importar leads comerciales en lote' })
  importMany(@Body() dto: ImportMarketingLeadsDto, @Request() req) {
    return this.marketingLeadsService.importMany(dto, req.user);
  }

  @Post('discover/openstreetmap')
  @ApiOperation({
    summary: 'Descubrir e importar leads de Cucuta desde OpenStreetMap/Overpass',
  })
  discoverFromOpenStreetMap(
    @Body() dto: DiscoverMarketingLeadsDto,
    @Request() req,
  ) {
    return this.marketingLeadsService.discoverFromOpenStreetMap(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar leads comerciales' })
  findAll(@Query() filters: FilterMarketingLeadDto, @Request() req) {
    return this.marketingLeadsService.findAll(filters, req.user);
  }

  @Post('send-software-info')
  @ApiOperation({ summary: 'Enviar informacion comercial de Jook ERP en lote' })
  sendSoftwareInfoBatch(@Body() dto: SendLeadInfoDto, @Request() req) {
    return this.marketingLeadsService.sendSoftwareInfoBatch(dto.leadIds, req.user);
  }

  @Public()
  @Get('unsubscribe/:token')
  @ApiOperation({ summary: 'Baja publica de comunicaciones comerciales' })
  optOut(@Param('token') token: string) {
    return this.marketingLeadsService.optOut(token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener lead comercial por ID' })
  @ApiParam({ name: 'id', example: 1 })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.marketingLeadsService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar lead comercial' })
  @ApiParam({ name: 'id', example: 1 })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMarketingLeadDto,
    @Request() req,
  ) {
    return this.marketingLeadsService.update(id, dto, req.user);
  }

  @Post(':id/send-software-info')
  @ApiOperation({ summary: 'Enviar informacion comercial de Jook ERP a un lead' })
  @ApiParam({ name: 'id', example: 1 })
  sendSoftwareInfo(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.marketingLeadsService.sendSoftwareInfo(id, req.user);
  }
}
