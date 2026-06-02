import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { ProjectPhase } from './entities/project-phase.entity';
import { ProjectMilestone } from './entities/project-milestone.entity';
import { ProjectTask } from './entities/project-task.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './services/projects.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectPhase,
      ProjectMilestone,
      ProjectTask,
    ]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [TypeOrmModule, ProjectsService],
})
export class ProjectsModule {}
