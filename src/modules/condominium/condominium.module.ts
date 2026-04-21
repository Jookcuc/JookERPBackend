import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Condominium } from './entities/condominium.entity';
import { StructuralUnit } from './entities/structural-unit.entity';
import { PropertyUnit } from './entities/property-unit.entity';
import { ResidentProfile } from './entities/resident-profile.entity';
import { CondoFee } from './entities/condo-fee.entity';
import { Communication } from './entities/communication.entity';
import { MaintenanceTicket } from './entities/maintenance-ticket.entity';
import { AccessLog } from './entities/access-log.entity';
import { CommonArea } from './entities/common-area.entity';
import { CondoDocument } from './entities/condo-document.entity';
import { CondominiumService } from './services/condominium.service';
import { BillingService } from './services/billing.service';
import { OperationService } from './services/operation.service';
import { CondominiumController } from './controllers/condominium.controller';
import { BillingController } from './controllers/billing.controller';
import { OperationController } from './controllers/operation.controller';
import { CondominiumTestController } from './test-suite';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Condominium,
      StructuralUnit,
      PropertyUnit,
      ResidentProfile,
      CondoFee,
      Communication,
      MaintenanceTicket,
      AccessLog,
      CommonArea,
      CondoDocument,
    ]),
  ],
  controllers: [
    CondominiumController,
    BillingController,
    OperationController,
    CondominiumTestController,
  ],
  providers: [
    CondominiumService,
    BillingService,
    OperationService,
  ],
  exports: [
    CondominiumService,
    BillingService,
    OperationService,
  ],
})
export class CondominiumModule {}
