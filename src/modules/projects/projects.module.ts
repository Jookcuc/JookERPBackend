import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { ProjectPhase } from './entities/project-phase.entity';
import { ProjectMilestone } from './entities/project-milestone.entity';
import { ProjectTask } from './entities/project-task.entity';
import { ProjectMember } from './entities/project-member.entity';
import { TimeLog } from './entities/time-log.entity';
import { ProjectExpense } from './entities/project-expense.entity';
import { MaterialConsumption } from './entities/material-consumption.entity';
import { ProjectMaterial } from './entities/project-material.entity';
import { ProjectUpdate } from './entities/project-update.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './services/projects.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectPhase,
      ProjectMilestone,
      ProjectTask,
      ProjectMember,
      TimeLog,
      ProjectExpense,
      MaterialConsumption,
      ProjectMaterial,
      ProjectUpdate,
    ]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [TypeOrmModule, ProjectsService],
})
export class ProjectsModule {}
