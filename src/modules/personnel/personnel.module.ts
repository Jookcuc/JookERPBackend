import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transactions/entities/transaction.entity';
import { S3Module } from '../s3/s3.module';
import { PersonnelController } from './personnel.controller';
import { PersonnelService } from './personnel.service';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { Employee } from './entities/employee.entity';
import { LeaveRequest } from './entities/leave-request.entity';
import { Payroll } from './entities/payroll.entity';
import { PerformanceReview } from './entities/performance-review.entity';
import { Settlement } from './entities/settlement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      Payroll,
      AttendanceRecord,
      LeaveRequest,
      PerformanceReview,
      Settlement,
      Transaction,
    ]),
    S3Module,
  ],
  controllers: [PersonnelController],
  providers: [PersonnelService],
  exports: [PersonnelService],
})
export class PersonnelModule {}

