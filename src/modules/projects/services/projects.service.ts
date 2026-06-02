import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectPhase } from '../entities/project-phase.entity';
import { ProjectMilestone } from '../entities/project-milestone.entity';
import { ProjectTask } from '../entities/project-task.entity';
import {
  CreateProjectDto,
  FilterProjectDto,
  UpdateProjectDto,
} from '../dto/project.dto';
import {
  CreateProjectPhaseDto,
  UpdateProjectPhaseDto,
} from '../dto/project-phase.dto';
import {
  CreateProjectMilestoneDto,
  UpdateProjectMilestoneDto,
} from '../dto/project-milestone.dto';
import {
  CreateProjectTaskDto,
  UpdateProjectTaskDto,
} from '../dto/project-task.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectPhase)
    private readonly phaseRepository: Repository<ProjectPhase>,
    @InjectRepository(ProjectMilestone)
    private readonly milestoneRepository: Repository<ProjectMilestone>,
    @InjectRepository(ProjectTask)
    private readonly taskRepository: Repository<ProjectTask>,
  ) {}

  // --- PROJECTS ---

  async createProject(dto: CreateProjectDto) {
    const project = this.projectRepository.create(dto);
    return this.projectRepository.save(project);
  }

  async findAllProjects(filters: FilterProjectDto) {
    const query = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.company', 'company')
      .leftJoinAndSelect('project.contact', 'contact')
      .leftJoinAndSelect('project.manager', 'manager');

    if (filters.companyId) {
      query.andWhere('project.companyId = :companyId', {
        companyId: filters.companyId,
      });
    }
    if (filters.managerId) {
      query.andWhere('project.managerId = :managerId', {
        managerId: filters.managerId,
      });
    }
    if (filters.status) {
      query.andWhere('project.status = :status', { status: filters.status });
    }

    return query.getMany();
  }

  async findProjectById(id: number) {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: [
        'company',
        'contact',
        'manager',
        'phases',
        'phases.tasks',
        'phases.tasks.dependsOn',
        'milestones',
      ],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async updateProject(id: number, dto: UpdateProjectDto) {
    const project = await this.findProjectById(id);
    this.projectRepository.merge(project, dto);
    return this.projectRepository.save(project);
  }

  async removeProject(id: number) {
    const project = await this.findProjectById(id);
    return this.projectRepository.remove(project);
  }

  // --- PHASES ---

  async createPhase(dto: CreateProjectPhaseDto) {
    const phase = this.phaseRepository.create(dto);
    return this.phaseRepository.save(phase);
  }

  async updatePhase(id: number, dto: UpdateProjectPhaseDto) {
    const phase = await this.phaseRepository.findOne({ where: { id } });
    if (!phase) throw new NotFoundException(`Phase with ID ${id} not found`);

    this.phaseRepository.merge(phase, dto);
    return this.phaseRepository.save(phase);
  }

  async removePhase(id: number) {
    const phase = await this.phaseRepository.findOne({ where: { id } });
    if (!phase) throw new NotFoundException(`Phase with ID ${id} not found`);
    return this.phaseRepository.remove(phase);
  }

  // --- MILESTONES ---

  async createMilestone(dto: CreateProjectMilestoneDto) {
    const milestone = this.milestoneRepository.create(dto);
    return this.milestoneRepository.save(milestone);
  }

  async updateMilestone(id: number, dto: UpdateProjectMilestoneDto) {
    const milestone = await this.milestoneRepository.findOne({ where: { id } });
    if (!milestone)
      throw new NotFoundException(`Milestone with ID ${id} not found`);

    this.milestoneRepository.merge(milestone, dto);
    return this.milestoneRepository.save(milestone);
  }

  async removeMilestone(id: number) {
    const milestone = await this.milestoneRepository.findOne({ where: { id } });
    if (!milestone)
      throw new NotFoundException(`Milestone with ID ${id} not found`);
    return this.milestoneRepository.remove(milestone);
  }

  // --- TASKS ---

  async createTask(dto: CreateProjectTaskDto) {
    const { dependsOnIds, ...taskData } = dto;
    const task = this.taskRepository.create(taskData);

    if (dependsOnIds && dependsOnIds.length > 0) {
      const dependencies = await this.taskRepository.find({
        where: { id: In(dependsOnIds) },
      });
      task.dependsOn = dependencies;
    }

    return this.taskRepository.save(task);
  }

  async updateTask(id: number, dto: UpdateProjectTaskDto) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['dependsOn'],
    });

    if (!task) throw new NotFoundException(`Task with ID ${id} not found`);

    const { dependsOnIds, ...taskData } = dto;

    // Check for circular dependencies
    if (dependsOnIds) {
      if (dependsOnIds.includes(id)) {
        throw new BadRequestException('A task cannot depend on itself');
      }

      const newDependencies = await this.taskRepository.find({
        where: { id: In(dependsOnIds) },
        relations: ['dependsOn'], // Simplistic check, for deeper check recursive function is needed
      });

      // Basic circular check (1 level)
      for (const dep of newDependencies) {
        if (dep.dependsOn?.some((d) => d.id === id)) {
          throw new BadRequestException(
            `Circular dependency detected: Task ${dep.id} already depends on Task ${id}`,
          );
        }
      }

      task.dependsOn = newDependencies;
    }

    this.taskRepository.merge(task, taskData);
    return this.taskRepository.save(task);
  }

  async removeTask(id: number) {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task with ID ${id} not found`);
    return this.taskRepository.remove(task);
  }
}
