import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
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
import {
  AttendanceRecord,
  AttendanceType,
} from './entities/attendance-record.entity';
import {
  ContractType,
  Employee,
  EmployeeStatus,
} from './entities/employee.entity';
import { LeaveRequest, LeaveStatus } from './entities/leave-request.entity';
import { Payroll, PayrollStatus } from './entities/payroll.entity';
import { PerformanceReview } from './entities/performance-review.entity';
import { Settlement, SettlementStatus } from './entities/settlement.entity';
import {
  MovementType,
  Transaction,
} from '../transactions/entities/transaction.entity';

interface AuthenticatedUser {
  id: number;
  companyId: number;
}

@Injectable()
export class PersonnelService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Payroll)
    private readonly payrollRepo: Repository<Payroll>,
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepo: Repository<AttendanceRecord>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRepo: Repository<LeaveRequest>,
    @InjectRepository(PerformanceReview)
    private readonly reviewRepo: Repository<PerformanceReview>,
    @InjectRepository(Settlement)
    private readonly settlementRepo: Repository<Settlement>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async createEmployee(
    dto: CreateEmployeeDto,
    user: AuthenticatedUser,
  ): Promise<Employee> {
    await this.ensureEmployeeDocumentAvailable(
      dto.documentNumber,
      user.companyId,
    );

    const employee = this.employeeRepo.create({
      ...dto,
      companyId: user.companyId,
      userId: user.id,
      status: dto.status ?? EmployeeStatus.ACTIVO,
    });

    return this.employeeRepo.save(employee);
  }

  async findEmployees(filters: FilterEmployeeDto, user: AuthenticatedUser) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.employeeRepo
      .createQueryBuilder('employee')
      .where('employee.companyId = :companyId', { companyId: user.companyId });

    if (filters.search) {
      qb.andWhere(
        new Brackets((subQuery) => {
          subQuery
            .where('employee.firstName ILIKE :search', {
              search: `%${filters.search}%`,
            })
            .orWhere('employee.lastName ILIKE :search', {
              search: `%${filters.search}%`,
            })
            .orWhere('employee.documentNumber ILIKE :search', {
              search: `%${filters.search}%`,
            })
            .orWhere('employee.position ILIKE :search', {
              search: `%${filters.search}%`,
            });
        }),
      );
    }

    if (filters.department) {
      qb.andWhere('employee.department ILIKE :department', {
        department: `%${filters.department}%`,
      });
    }

    if (filters.status) {
      qb.andWhere('employee.status = :status', { status: filters.status });
    }

    const [data, total] = await qb
      .orderBy('employee.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findEmployee(id: number, user: AuthenticatedUser): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: { id, companyId: user.companyId },
    });

    if (!employee) {
      throw new NotFoundException(`Empleado con id ${id} no encontrado`);
    }

    return employee;
  }

  async updateEmployee(
    id: number,
    dto: UpdateEmployeeDto,
    user: AuthenticatedUser,
  ): Promise<Employee> {
    const employee = await this.findEmployee(id, user);

    if (dto.documentNumber && dto.documentNumber !== employee.documentNumber) {
      await this.ensureEmployeeDocumentAvailable(
        dto.documentNumber,
        user.companyId,
      );
    }

    Object.assign(employee, dto);

    return this.employeeRepo.save(employee);
  }

  async removeEmployee(id: number, user: AuthenticatedUser) {
    const employee = await this.findEmployee(id, user);
    employee.status = EmployeeStatus.INACTIVO;
    employee.terminationDate = employee.terminationDate ?? new Date();
    await this.employeeRepo.save(employee);

    return {
      message: `Empleado "${employee.firstName} ${employee.lastName}" desactivado correctamente`,
    };
  }

  async createPayroll(
    dto: CreatePayrollDto,
    user: AuthenticatedUser,
  ): Promise<Payroll> {
    const employee = await this.findEmployee(dto.employeeId, user);
    this.validateDateRange(
      dto.periodStart,
      dto.periodEnd,
      'La fecha inicial no puede ser mayor a la final',
    );

    const baseSalary = Number(employee.baseSalary) || 0;
    const workedDays = dto.workedDays ?? 30;
    const bonuses = Number(dto.bonuses ?? 0);
    const deductions = Number(dto.deductions ?? 0);
    const extraHours = Number(dto.extraHours ?? 0);
    const dailyRate = baseSalary / 30;
    const hourlyRate = dailyRate / 8;
    const grossAmount = this.roundAmount(
      dailyRate * workedDays + hourlyRate * extraHours + bonuses,
    );
    const netAmount = this.roundAmount(grossAmount - deductions);

    const payroll = this.payrollRepo.create({
      companyId: user.companyId,
      userId: user.id,
      employeeId: employee.id,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      baseSalary,
      workedDays,
      extraHours,
      bonuses,
      deductions,
      grossAmount,
      netAmount,
      payslipUrl: dto.payslipUrl,
      notes: dto.notes,
      status: PayrollStatus.BORRADOR,
    });

    return this.payrollRepo.save(payroll);
  }

  async findPayrolls(filters: FilterPayrollDto, user: AuthenticatedUser) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.payrollRepo
      .createQueryBuilder('payroll')
      .leftJoinAndSelect('payroll.employee', 'employee')
      .where('payroll.companyId = :companyId', { companyId: user.companyId });

    if (filters.employeeId) {
      qb.andWhere('payroll.employeeId = :employeeId', {
        employeeId: filters.employeeId,
      });
    }

    if (filters.status) {
      qb.andWhere('payroll.status = :status', { status: filters.status });
    }

    if (filters.periodStart) {
      qb.andWhere('payroll.periodStart >= :periodStart', {
        periodStart: filters.periodStart,
      });
    }

    if (filters.periodEnd) {
      qb.andWhere('payroll.periodEnd <= :periodEnd', {
        periodEnd: filters.periodEnd,
      });
    }

    const [data, total] = await qb
      .orderBy('payroll.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findPayroll(id: number, user: AuthenticatedUser): Promise<Payroll> {
    const payroll = await this.payrollRepo.findOne({
      where: { id, companyId: user.companyId },
      relations: ['employee'],
    });

    if (!payroll) {
      throw new NotFoundException(`Nomina con id ${id} no encontrada`);
    }

    return payroll;
  }

  async payPayroll(
    id: number,
    dto: PayPayrollDto,
    user: AuthenticatedUser,
  ): Promise<Payroll> {
    const payroll = await this.findPayroll(id, user);

    if (payroll.status === PayrollStatus.PAGADA) {
      throw new BadRequestException('La nomina ya fue pagada');
    }

    const paymentDate =
      dto.paymentDate ?? new Date().toISOString().slice(0, 10);
    payroll.status = PayrollStatus.PAGADA;
    payroll.paymentDate = new Date(paymentDate);
    await this.payrollRepo.save(payroll);

    await this.transactionRepo.save(
      this.transactionRepo.create({
        companyId: user.companyId,
        employeeId: payroll.employeeId,
        payrollId: payroll.id,
        reference: `PAY-${payroll.id}`,
        category: 'Nomina',
        status: 'Completada',
        amount: -Math.abs(Number(payroll.netAmount)),
        method: dto.method ?? 'Transferencia',
        description:
          dto.description ??
          `Pago de nomina para ${payroll.employee.firstName} ${payroll.employee.lastName}`,
        movement: MovementType.SALIDA,
        date: paymentDate,
        bankId: dto.bankId,
      }),
    );

    return this.findPayroll(id, user);
  }

  async getPayrollPayslip(id: number, user: AuthenticatedUser) {
    const payroll = await this.findPayroll(id, user);

    return {
      payrollId: payroll.id,
      employee: payroll.employee,
      periodStart: payroll.periodStart,
      periodEnd: payroll.periodEnd,
      baseSalary: Number(payroll.baseSalary),
      workedDays: payroll.workedDays,
      extraHours: Number(payroll.extraHours),
      bonuses: Number(payroll.bonuses),
      deductions: Number(payroll.deductions),
      grossAmount: Number(payroll.grossAmount),
      netAmount: Number(payroll.netAmount),
      paymentDate: payroll.paymentDate,
      status: payroll.status,
      payslipUrl: payroll.payslipUrl,
      notes: payroll.notes,
    };
  }

  async createAttendance(
    dto: CreateAttendanceDto,
    user: AuthenticatedUser,
  ): Promise<AttendanceRecord> {
    await this.findEmployee(dto.employeeId, user);

    const attendance = this.attendanceRepo.create({
      ...dto,
      companyId: user.companyId,
      hoursWorked: dto.hoursWorked ?? 0,
      type: dto.type ?? AttendanceType.PRESENTE,
    });

    return this.attendanceRepo.save(attendance);
  }

  async findAttendances(filters: FilterAttendanceDto, user: AuthenticatedUser) {
    const qb = this.attendanceRepo
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .where('attendance.companyId = :companyId', {
        companyId: user.companyId,
      });

    if (filters.employeeId) {
      qb.andWhere('attendance.employeeId = :employeeId', {
        employeeId: filters.employeeId,
      });
    }

    if (filters.type) {
      qb.andWhere('attendance.type = :type', { type: filters.type });
    }

    if (filters.startDate) {
      qb.andWhere('attendance.date >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      qb.andWhere('attendance.date <= :endDate', { endDate: filters.endDate });
    }

    return qb.orderBy('attendance.date', 'DESC').getMany();
  }

  async createLeaveRequest(
    dto: CreateLeaveRequestDto,
    user: AuthenticatedUser,
  ): Promise<LeaveRequest> {
    await this.findEmployee(dto.employeeId, user);
    this.validateDateRange(
      dto.startDate,
      dto.endDate,
      'La fecha inicial del permiso no puede ser mayor a la final',
    );

    const leave = this.leaveRepo.create({
      ...dto,
      companyId: user.companyId,
      days: dto.days ?? this.calculateDays(dto.startDate, dto.endDate),
      status: LeaveStatus.PENDIENTE,
    });

    return this.leaveRepo.save(leave);
  }

  async findLeaveRequests(filters: FilterLeaveDto, user: AuthenticatedUser) {
    const qb = this.leaveRepo
      .createQueryBuilder('leave')
      .leftJoinAndSelect('leave.employee', 'employee')
      .where('leave.companyId = :companyId', { companyId: user.companyId })
      .orderBy('leave.createdAt', 'DESC');

    if (filters.employeeId) {
      qb.andWhere('leave.employeeId = :employeeId', {
        employeeId: filters.employeeId,
      });
    }

    if (filters.type) {
      qb.andWhere('leave.type = :type', { type: filters.type });
    }

    if (filters.status) {
      qb.andWhere('leave.status = :status', { status: filters.status });
    }

    return qb.getMany();
  }

  async updateLeaveStatus(
    id: number,
    dto: UpdateLeaveStatusDto,
    user: AuthenticatedUser,
  ): Promise<LeaveRequest> {
    const leave = await this.leaveRepo.findOne({
      where: { id, companyId: user.companyId },
      relations: ['employee'],
    });

    if (!leave) {
      throw new NotFoundException(`Solicitud con id ${id} no encontrada`);
    }

    leave.status = dto.status;
    leave.approvedBy = dto.status === LeaveStatus.PENDIENTE ? null : user.id;
    leave.approvedAt = dto.status === LeaveStatus.PENDIENTE ? null : new Date();

    return this.leaveRepo.save(leave);
  }

  async createPerformanceReview(
    dto: CreatePerformanceReviewDto,
    user: AuthenticatedUser,
  ): Promise<PerformanceReview> {
    await this.findEmployee(dto.employeeId, user);

    const review = this.reviewRepo.create({
      ...dto,
      companyId: user.companyId,
    });

    return this.reviewRepo.save(review);
  }

  async findPerformanceReviews(
    filters: FilterReviewDto,
    user: AuthenticatedUser,
  ) {
    const where: Record<string, unknown> = { companyId: user.companyId };

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    return this.reviewRepo.find({
      where,
      relations: ['employee'],
      order: { reviewDate: 'DESC' },
    });
  }

  async createSettlement(
    dto: CreateSettlementDto,
    user: AuthenticatedUser,
  ): Promise<Settlement> {
    const employee = await this.findEmployee(dto.employeeId, user);
    const severanceAmount = Number(dto.severanceAmount ?? 0);
    const pendingVacationAmount = Number(dto.pendingVacationAmount ?? 0);
    const bonusesAmount = Number(dto.bonusesAmount ?? 0);
    const deductionsAmount = Number(dto.deductionsAmount ?? 0);
    const totalAmount = this.roundAmount(
      severanceAmount +
        pendingVacationAmount +
        bonusesAmount -
        deductionsAmount,
    );

    const settlement = this.settlementRepo.create({
      companyId: user.companyId,
      userId: user.id,
      employeeId: employee.id,
      terminationDate: dto.terminationDate,
      reason: dto.reason,
      severanceAmount,
      pendingVacationAmount,
      bonusesAmount,
      deductionsAmount,
      totalAmount,
      notes: dto.notes,
      status: SettlementStatus.BORRADOR,
    });

    employee.status = EmployeeStatus.RETIRADO;
    employee.terminationDate = new Date(dto.terminationDate);
    await this.employeeRepo.save(employee);

    return this.settlementRepo.save(settlement);
  }

  async findSettlements(filters: FilterSettlementDto, user: AuthenticatedUser) {
    const where: Record<string, unknown> = { companyId: user.companyId };

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    return this.settlementRepo.find({
      where,
      relations: ['employee'],
      order: { createdAt: 'DESC' },
    });
  }

  async paySettlement(
    id: number,
    dto: PaySettlementDto,
    user: AuthenticatedUser,
  ): Promise<Settlement> {
    const settlement = await this.settlementRepo.findOne({
      where: { id, companyId: user.companyId },
      relations: ['employee'],
    });

    if (!settlement) {
      throw new NotFoundException(`Liquidacion con id ${id} no encontrada`);
    }

    if (settlement.status === SettlementStatus.PAGADA) {
      throw new BadRequestException('La liquidacion ya fue pagada');
    }

    const paymentDate =
      dto.paymentDate ?? new Date().toISOString().slice(0, 10);
    settlement.status = SettlementStatus.PAGADA;
    settlement.paymentDate = new Date(paymentDate);
    await this.settlementRepo.save(settlement);

    await this.transactionRepo.save(
      this.transactionRepo.create({
        companyId: user.companyId,
        employeeId: settlement.employeeId,
        settlementId: settlement.id,
        reference: `SET-${settlement.id}`,
        category: 'Liquidacion',
        status: 'Completada',
        amount: -Math.abs(Number(settlement.totalAmount)),
        method: dto.method ?? 'Transferencia',
        description:
          dto.description ??
          `Pago de liquidacion para ${settlement.employee.firstName} ${settlement.employee.lastName}`,
        movement: MovementType.SALIDA,
        date: paymentDate,
        bankId: dto.bankId,
      }),
    );

    return this.settlementRepo.findOne({
      where: { id, companyId: user.companyId },
      relations: ['employee'],
    }) as Promise<Settlement>;
  }

  async findEmployeePaymentHistory(id: number, user: AuthenticatedUser) {
    await this.findEmployee(id, user);

    return this.transactionRepo.find({
      where: { companyId: user.companyId, employeeId: id },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async getCatalogs() {
    return {
      employeeStatus: Object.values(EmployeeStatus),
      contractTypes: Object.values(ContractType),
      payrollStatus: Object.values(PayrollStatus),
      attendanceTypes: Object.values(AttendanceType),
      leaveStatus: Object.values(LeaveStatus),
    };
  }

  private async ensureEmployeeDocumentAvailable(
    documentNumber: string,
    companyId: number,
  ) {
    const existingEmployee = await this.employeeRepo.findOne({
      where: { companyId, documentNumber },
    });

    if (existingEmployee) {
      throw new BadRequestException(
        `Ya existe un empleado con documento ${documentNumber}`,
      );
    }
  }

  private validateDateRange(
    startDate: string,
    endDate: string,
    message: string,
  ) {
    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException(message);
    }
  }

  private calculateDays(startDate: string, endDate: string): number {
    const diffTime =
      new Date(endDate).getTime() - new Date(startDate).getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  private roundAmount(value: number): number {
    return Number(value.toFixed(2));
  }
}
