import { Controller, Get, Post, Body, Param, Put, UseGuards } from '@nestjs/common';
import { OperationService } from '../services/operation.service';
import { JwtAuthGuard } from '../../../common/guard/jwt-auth.guard';
import { TicketStatus } from '../entities/maintenance-ticket.entity';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Condominium Operations')
@ApiBearerAuth('JWT-auth')
@Controller('condo-operations')
@UseGuards(JwtAuthGuard)
export class OperationController {
  constructor(private readonly operationService: OperationService) {}

  @Post('access/entry')
  @ApiOperation({ summary: 'Register visitor entry' })
  async registerEntry(@Body() data: { unitId: number, name: string, document?: string, plate?: string }) {
    return await this.operationService.registerEntry(data.unitId, data.name, data.document, data.plate);
  }

  @Put('access/exit/:id')
  @ApiOperation({ summary: 'Register visitor exit' })
  async registerExit(@Param('id') id: string) {
    return await this.operationService.registerExit(+id);
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Create a maintenance ticket or PQRS' })
  async createTicket(@Body() data: any) {
    return await this.operationService.createTicket(data);
  }

  @Put('tickets/:id/status')
  @ApiOperation({ summary: 'Update maintenance ticket status' })
  async updateTicketStatus(@Param('id') id: string, @Body('status') status: TicketStatus) {
    return await this.operationService.updateTicketStatus(+id, status);
  }

  @Get('communications/:condoId')
  @ApiOperation({ summary: 'Get active communications/notices for residents' })
  async getCommunications(@Param('condoId') condoId: string) {
    return await this.operationService.getActiveCommunications(+condoId);
  }
}
