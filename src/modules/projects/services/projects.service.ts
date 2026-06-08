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
import { ProjectMember } from '../entities/project-member.entity';
import {
  CreateProjectMemberDto,
  UpdateProjectMemberDto,
} from '../dto/project-member.dto';
import { ProjectMaterial } from '../entities/project-material.entity';
import {
  CreateProjectMaterialDto,
  UpdateProjectMaterialDto,
} from '../dto/project-material.dto';
import { TimeLog } from '../entities/time-log.entity';
import { CreateTimeLogDto, UpdateTimeLogDto } from '../dto/time-log.dto';
import { ProjectExpense } from '../entities/project-expense.entity';
import {
  CreateProjectExpenseDto,
  UpdateProjectExpenseDto,
} from '../dto/project-expense.dto';
import { MaterialConsumption } from '../entities/material-consumption.entity';
import {
  CreateMaterialConsumptionDto,
  UpdateMaterialConsumptionDto,
} from '../dto/material-consumption.dto';
import { ProjectUpdate } from '../entities/project-update.entity';
import {
  CreateProjectUpdateDto,
  UpdateProjectUpdateDto,
} from '../dto/project-update.dto';

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
    @InjectRepository(ProjectMember)
    private readonly memberRepository: Repository<ProjectMember>,
    @InjectRepository(ProjectMaterial)
    private readonly materialRepository: Repository<ProjectMaterial>,
    @InjectRepository(TimeLog)
    private readonly timeLogRepository: Repository<TimeLog>,
    @InjectRepository(ProjectExpense)
    private readonly expenseRepository: Repository<ProjectExpense>,
    @InjectRepository(MaterialConsumption)
    private readonly consumptionRepository: Repository<MaterialConsumption>,
    @InjectRepository(ProjectUpdate)
    private readonly updateRepository: Repository<ProjectUpdate>,
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
        'members',
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

  // --- PROJECT MEMBERS ---
  async createMember(dto: CreateProjectMemberDto) {
    const member = this.memberRepository.create(dto);
    return this.memberRepository.save(member);
  }

  async findMembersByProject(projectId: number) {
    return this.memberRepository.find({
      where: { projectId },
      relations: ['employee'],
    });
  }

  async findMemberById(id: number) {
    const member = await this.memberRepository.findOne({
      where: { id },
      relations: ['employee', 'project'],
    });
    if (!member) throw new NotFoundException(`Member with ID ${id} not found`);
    return member;
  }

  async updateMember(id: number, dto: UpdateProjectMemberDto) {
    const member = await this.memberRepository.findOne({ where: { id } });
    if (!member) throw new NotFoundException(`Member with ID ${id} not found`);
    this.memberRepository.merge(member, dto);
    return this.memberRepository.save(member);
  }

  async removeMember(id: number) {
    const member = await this.memberRepository.findOne({ where: { id } });
    if (!member) throw new NotFoundException(`Member with ID ${id} not found`);
    return this.memberRepository.remove(member);
  }

  // --- PHASES ---

  async createPhase(dto: CreateProjectPhaseDto) {
    const phase = this.phaseRepository.create(dto);
    return this.phaseRepository.save(phase);
  }

  async findPhasesByProject(projectId: number) {
    return this.phaseRepository.find({
      where: { projectId },
      order: { startDate: 'ASC' },
    });
  }

  async findPhaseById(id: number) {
    const phase = await this.phaseRepository.findOne({
      where: { id },
      relations: ['tasks', 'tasks.dependsOn', 'milestones'],
    });
    if (!phase) throw new NotFoundException(`Phase with ID ${id} not found`);
    return phase;
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

  async findMilestonesByProject(projectId: number) {
    return this.milestoneRepository.find({
      where: { projectId },
      relations: ['phase'],
      order: { date: 'ASC' },
    });
  }

  async findMilestoneById(id: number) {
    const milestone = await this.milestoneRepository.findOne({
      where: { id },
      relations: ['project', 'phase'],
    });
    if (!milestone)
      throw new NotFoundException(`Milestone with ID ${id} not found`);
    return milestone;
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

  async findTasksByPhase(phaseId: number) {
    return this.taskRepository.find({
      where: { phaseId },
      relations: ['dependsOn', 'timeLogs'],
      order: { createdAt: 'ASC' },
    });
  }

  async findTaskById(id: number) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['phase', 'phase.project', 'dependsOn', 'timeLogs'],
    });
    if (!task) throw new NotFoundException(`Task with ID ${id} not found`);
    return task;
  }

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

  // --- PROJECT MATERIALS (RF3 - Planificación de materiales) ---

  async createMaterial(dto: CreateProjectMaterialDto) {
    const material = this.materialRepository.create(dto);
    return this.materialRepository.save(material);
  }

  async findMaterialsByProject(projectId: number) {
    return this.materialRepository.find({
      where: { projectId },
      relations: ['product', 'task'],
    });
  }

  async findMaterialById(id: number) {
    const material = await this.materialRepository.findOne({
      where: { id },
      relations: ['product', 'task', 'project'],
    });
    if (!material)
      throw new NotFoundException(`ProjectMaterial with ID ${id} not found`);
    return material;
  }

  async updateMaterial(id: number, dto: UpdateProjectMaterialDto) {
    const material = await this.materialRepository.findOne({ where: { id } });
    if (!material)
      throw new NotFoundException(`ProjectMaterial with ID ${id} not found`);
    this.materialRepository.merge(material, dto);
    return this.materialRepository.save(material);
  }

  async removeMaterial(id: number) {
    const material = await this.materialRepository.findOne({ where: { id } });
    if (!material)
      throw new NotFoundException(`ProjectMaterial with ID ${id} not found`);
    return this.materialRepository.remove(material);
  }

  // --- TIME LOGS (RF4 - Registro de tiempos) ---

  async createTimeLog(dto: CreateTimeLogDto) {
    const timeLog = this.timeLogRepository.create(dto);
    return this.timeLogRepository.save(timeLog);
  }

  async findTimeLogsByProject(projectId: number) {
    return this.timeLogRepository.find({
      where: { projectId },
      relations: ['employee', 'task'],
      order: { date: 'DESC' },
    });
  }

  async findTimeLogById(id: number) {
    const timeLog = await this.timeLogRepository.findOne({
      where: { id },
      relations: ['employee', 'task', 'project'],
    });
    if (!timeLog)
      throw new NotFoundException(`TimeLog with ID ${id} not found`);
    return timeLog;
  }

  async updateTimeLog(id: number, dto: UpdateTimeLogDto) {
    const timeLog = await this.timeLogRepository.findOne({ where: { id } });
    if (!timeLog)
      throw new NotFoundException(`TimeLog with ID ${id} not found`);
    this.timeLogRepository.merge(timeLog, dto);
    return this.timeLogRepository.save(timeLog);
  }

  async removeTimeLog(id: number) {
    const timeLog = await this.timeLogRepository.findOne({ where: { id } });
    if (!timeLog)
      throw new NotFoundException(`TimeLog with ID ${id} not found`);
    return this.timeLogRepository.remove(timeLog);
  }

  // --- PROJECT EXPENSES (RF4 - Registro de gastos) ---

  async createExpense(dto: CreateProjectExpenseDto) {
    const expense = this.expenseRepository.create(dto);
    return this.expenseRepository.save(expense);
  }

  async findExpensesByProject(projectId: number) {
    return this.expenseRepository.find({
      where: { projectId },
      relations: ['task', 'invoice'],
      order: { expenseDate: 'DESC' },
    });
  }

  async findExpenseById(id: number) {
    const expense = await this.expenseRepository.findOne({
      where: { id },
      relations: ['task', 'project', 'invoice'],
    });
    if (!expense)
      throw new NotFoundException(`ProjectExpense with ID ${id} not found`);
    return expense;
  }

  async updateExpense(id: number, dto: UpdateProjectExpenseDto) {
    const expense = await this.expenseRepository.findOne({ where: { id } });
    if (!expense)
      throw new NotFoundException(`ProjectExpense with ID ${id} not found`);
    this.expenseRepository.merge(expense, dto);
    return this.expenseRepository.save(expense);
  }

  async removeExpense(id: number) {
    const expense = await this.expenseRepository.findOne({ where: { id } });
    if (!expense)
      throw new NotFoundException(`ProjectExpense with ID ${id} not found`);
    return this.expenseRepository.remove(expense);
  }

  // --- MATERIAL CONSUMPTIONS (RF4 - Registro de consumo real de materiales) ---

  async createConsumption(dto: CreateMaterialConsumptionDto) {
    const consumption = this.consumptionRepository.create(dto);
    return this.consumptionRepository.save(consumption);
  }

  async findConsumptionsByProject(projectId: number) {
    return this.consumptionRepository.find({
      where: { projectId },
      relations: ['product', 'task'],
      order: { date: 'DESC' },
    });
  }

  async findConsumptionById(id: number) {
    const consumption = await this.consumptionRepository.findOne({
      where: { id },
      relations: ['product', 'task', 'project'],
    });
    if (!consumption)
      throw new NotFoundException(
        `MaterialConsumption with ID ${id} not found`,
      );
    return consumption;
  }

  async updateConsumption(id: number, dto: UpdateMaterialConsumptionDto) {
    const consumption = await this.consumptionRepository.findOne({
      where: { id },
    });
    if (!consumption)
      throw new NotFoundException(
        `MaterialConsumption with ID ${id} not found`,
      );
    this.consumptionRepository.merge(consumption, dto);
    return this.consumptionRepository.save(consumption);
  }

  async removeConsumption(id: number) {
    const consumption = await this.consumptionRepository.findOne({
      where: { id },
    });
    if (!consumption)
      throw new NotFoundException(
        `MaterialConsumption with ID ${id} not found`,
      );
    return this.consumptionRepository.remove(consumption);
  }

  // --- PROJECT UPDATES (RF4 - Registro de novedades) ---

  async createUpdate(dto: CreateProjectUpdateDto) {
    const update = this.updateRepository.create(dto);
    return this.updateRepository.save(update);
  }

  async findUpdatesByProject(projectId: number) {
    return this.updateRepository.find({
      where: { projectId },
      relations: ['author'],
      order: { date: 'DESC' },
    });
  }

  async findUpdateById(id: number) {
    const update = await this.updateRepository.findOne({
      where: { id },
      relations: ['author', 'project'],
    });
    if (!update)
      throw new NotFoundException(`ProjectUpdate with ID ${id} not found`);
    return update;
  }

  async updateUpdate(id: number, dto: UpdateProjectUpdateDto) {
    const update = await this.updateRepository.findOne({ where: { id } });
    if (!update)
      throw new NotFoundException(`ProjectUpdate with ID ${id} not found`);
    this.updateRepository.merge(update, dto);
    return this.updateRepository.save(update);
  }

  async removeUpdate(id: number) {
    const update = await this.updateRepository.findOne({ where: { id } });
    if (!update)
      throw new NotFoundException(`ProjectUpdate with ID ${id} not found`);
    return this.updateRepository.remove(update);
  }
}
