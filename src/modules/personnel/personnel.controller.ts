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
  ApiTags,
} from '@nestjs/swagger';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { CreatePerformanceReviewDto } from './dto/create-performance-review.dto';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { FilterAttendanceDto } from './dto/filter-attendance.dto';
import { FilterEmployeeDto } from './dto/filter-employee.dto';
import { FilterLeaveDto } from './dto/filter-leave.dto';
import { FilterPayrollDto } from './dto/filter-payroll.dto';
import { FilterReviewDto } from './dto/filter-review.dto';
import { FilterSettlementDto } from './dto/filter-settlement.dto';
import { PayPayrollDto } from './dto/pay-payroll.dto';
import { PaySettlementDto } from './dto/pay-settlement.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
import { PersonnelService } from './personnel.service';

@ApiTags('Personnel')
@ApiBearerAuth('JWT-auth')
@Controller('personnel')
export class PersonnelController {
  constructor(private readonly personnelService: PersonnelService) {}

  @Get('catalogs')
  @ApiOperation({ summary: 'Obtener catalogos del modulo de personal' })
  getCatalogs() {
    return this.personnelService.getCatalogs();
  }

  @Post('employees')
  @ApiOperation({ summary: 'Crear empleado' })
  createEmployee(@Body() dto: CreateEmployeeDto, @Request() req) {
    return this.personnelService.createEmployee(dto, req.user);
  }

  @Get('employees')
  @ApiOperation({ summary: 'Listar empleados' })
  findEmployees(@Query() filters: FilterEmployeeDto, @Request() req) {
    return this.personnelService.findEmployees(filters, req.user);
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'Obtener empleado por id' })
  @ApiParam({ name: 'id', example: 1 })
  findEmployee(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.personnelService.findEmployee(id, req.user);
  }

  @Patch('employees/:id')
  @ApiOperation({ summary: 'Actualizar empleado' })
  @ApiParam({ name: 'id', example: 1 })
  updateEmployee(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
    @Request() req,
  ) {
    return this.personnelService.updateEmployee(id, dto, req.user);
  }

  @Delete('employees/:id')
  @ApiOperation({ summary: 'Desactivar empleado' })
  @ApiParam({ name: 'id', example: 1 })
  removeEmployee(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.personnelService.removeEmployee(id, req.user);
  }

  @Get('employees/:id/payment-history')
  @ApiOperation({ summary: 'Historial de pagos del empleado' })
  @ApiParam({ name: 'id', example: 1 })
  findEmployeePaymentHistory(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return this.personnelService.findEmployeePaymentHistory(id, req.user);
  }

  @Post('payrolls')
  @ApiOperation({ summary: 'Crear nomina' })
  createPayroll(@Body() dto: CreatePayrollDto, @Request() req) {
    return this.personnelService.createPayroll(dto, req.user);
  }

  @Get('payrolls')
  @ApiOperation({ summary: 'Listar nominas' })
  findPayrolls(@Query() filters: FilterPayrollDto, @Request() req) {
    return this.personnelService.findPayrolls(filters, req.user);
  }

  @Get('payrolls/:id')
  @ApiOperation({ summary: 'Obtener nomina por id' })
  @ApiParam({ name: 'id', example: 1 })
  findPayroll(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.personnelService.findPayroll(id, req.user);
  }

  @Post('payrolls/:id/pay')
  @ApiOperation({ summary: 'Marcar nomina como pagada y crear transaccion' })
  @ApiParam({ name: 'id', example: 1 })
  payPayroll(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PayPayrollDto,
    @Request() req,
  ) {
    return this.personnelService.payPayroll(id, dto, req.user);
  }

  @Get('payrolls/:id/payslip')
  @ApiOperation({ summary: 'Obtener resumen tipo payslip de la nomina' })
  @ApiParam({ name: 'id', example: 1 })
  getPayrollPayslip(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.personnelService.getPayrollPayslip(id, req.user);
  }

  @Post('attendances')
  @ApiOperation({ summary: 'Registrar asistencia' })
  createAttendance(@Body() dto: CreateAttendanceDto, @Request() req) {
    return this.personnelService.createAttendance(dto, req.user);
  }

  @Get('attendances')
  @ApiOperation({ summary: 'Listar asistencias' })
  findAttendances(@Query() filters: FilterAttendanceDto, @Request() req) {
    return this.personnelService.findAttendances(filters, req.user);
  }

  @Post('leaves')
  @ApiOperation({ summary: 'Crear solicitud de vacaciones o permiso' })
  createLeaveRequest(@Body() dto: CreateLeaveRequestDto, @Request() req) {
    return this.personnelService.createLeaveRequest(dto, req.user);
  }

  @Get('leaves')
  @ApiOperation({ summary: 'Listar solicitudes de vacaciones o permisos' })
  findLeaveRequests(@Query() filters: FilterLeaveDto, @Request() req) {
    return this.personnelService.findLeaveRequests(filters, req.user);
  }

  @Patch('leaves/:id/status')
  @ApiOperation({ summary: 'Actualizar estado de una solicitud' })
  @ApiParam({ name: 'id', example: 1 })
  updateLeaveStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeaveStatusDto,
    @Request() req,
  ) {
    return this.personnelService.updateLeaveStatus(id, dto, req.user);
  }

  @Post('reviews')
  @ApiOperation({ summary: 'Registrar evaluacion de desempeno' })
  createPerformanceReview(
    @Body() dto: CreatePerformanceReviewDto,
    @Request() req,
  ) {
    return this.personnelService.createPerformanceReview(dto, req.user);
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Listar evaluaciones de desempeno' })
  findPerformanceReviews(@Query() filters: FilterReviewDto, @Request() req) {
    return this.personnelService.findPerformanceReviews(filters, req.user);
  }

  @Post('settlements')
  @ApiOperation({ summary: 'Crear liquidacion de despido' })
  createSettlement(@Body() dto: CreateSettlementDto, @Request() req) {
    return this.personnelService.createSettlement(dto, req.user);
  }

  @Get('settlements')
  @ApiOperation({ summary: 'Listar liquidaciones' })
  findSettlements(@Query() filters: FilterSettlementDto, @Request() req) {
    return this.personnelService.findSettlements(filters, req.user);
  }

  @Post('settlements/:id/pay')
  @ApiOperation({ summary: 'Pagar liquidacion y registrar transaccion' })
  @ApiParam({ name: 'id', example: 1 })
  paySettlement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PaySettlementDto,
    @Request() req,
  ) {
    return this.personnelService.paySettlement(id, dto, req.user);
  }
}
