import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './services/projects.service';
import {
  CreateProjectDto,
  FilterProjectDto,
  UpdateProjectDto,
} from './dto/project.dto';
import {
  CreateProjectPhaseDto,
  UpdateProjectPhaseDto,
} from './dto/project-phase.dto';
import {
  CreateProjectMilestoneDto,
  UpdateProjectMilestoneDto,
} from './dto/project-milestone.dto';
import {
  CreateProjectTaskDto,
  UpdateProjectTaskDto,
} from './dto/project-task.dto';
import {
  CreateProjectMemberDto,
  UpdateProjectMemberDto,
} from './dto/project-member.dto';
import {
  CreateProjectMaterialDto,
  UpdateProjectMaterialDto,
} from './dto/project-material.dto';
import { CreateTimeLogDto, UpdateTimeLogDto } from './dto/time-log.dto';
import {
  CreateProjectExpenseDto,
  UpdateProjectExpenseDto,
} from './dto/project-expense.dto';
import {
  CreateMaterialConsumptionDto,
  UpdateMaterialConsumptionDto,
} from './dto/material-consumption.dto';
import {
  CreateProjectUpdateDto,
  UpdateProjectUpdateDto,
} from './dto/project-update.dto';

@ApiTags('Projects')
@ApiBearerAuth('JWT-auth')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // --- PROJECTS ---

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo proyecto' })
  createProject(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.createProject(createProjectDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar proyectos' })
  findAllProjects(@Query() filters: FilterProjectDto) {
    return this.projectsService.findAllProjects(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un proyecto por id (con relaciones)' })
  findProjectById(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findProjectById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar proyecto' })
  updateProject(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.updateProject(id, updateProjectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar proyecto' })
  removeProject(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.removeProject(id);
  }

  // --- PROJECT MEMBERS (RF3 - Recursos humanos) ---

  @Post('members')
  @ApiOperation({ summary: 'Asignar un miembro al proyecto' })
  createMember(@Body() dto: CreateProjectMemberDto) {
    return this.projectsService.createMember(dto);
  }

  @Get(':projectId/members')
  @ApiOperation({ summary: 'Listar miembros de un proyecto' })
  findMembersByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectsService.findMembersByProject(projectId);
  }

  @Patch('members/:id')
  @ApiOperation({ summary: 'Actualizar asignación de miembro' })
  updateMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectMemberDto,
  ) {
    return this.projectsService.updateMember(id, dto);
  }

  @Get('members/:id')
  @ApiOperation({ summary: 'Obtener un miembro por ID del proyecto' })
  findMemberById(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findMemberById(id);
  }

  @Delete('members/:id')
  @ApiOperation({ summary: 'Remover miembro del proyecto' })
  removeMember(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.removeMember(id);
  }

  // --- PROJECT MATERIALS (RF3 - Planificación de materiales) ---

  @Post('materials')
  @ApiOperation({ summary: 'Planificar un material para el proyecto' })
  createMaterial(@Body() dto: CreateProjectMaterialDto) {
    return this.projectsService.createMaterial(dto);
  }

  @Get(':projectId/materials')
  @ApiOperation({ summary: 'Listar materiales planificados de un proyecto' })
  findMaterialsByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.projectsService.findMaterialsByProject(projectId);
  }

  @Get('materials/:id')
  @ApiOperation({ summary: 'Obtener un material planificado por ID' })
  findMaterialById(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findMaterialById(id);
  }

  @Patch('materials/:id')
  @ApiOperation({ summary: 'Actualizar material planificado' })
  updateMaterial(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectMaterialDto,
  ) {
    return this.projectsService.updateMaterial(id, dto);
  }

  @Delete('materials/:id')
  @ApiOperation({ summary: 'Eliminar material planificado' })
  removeMaterial(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.removeMaterial(id);
  }

  // --- PHASES ---

  @Post('phases')
  @ApiOperation({ summary: 'Crear una fase para un proyecto' })
  createPhase(@Body() createPhaseDto: CreateProjectPhaseDto) {
    return this.projectsService.createPhase(createPhaseDto);
  }

  @Patch('phases/:id')
  @ApiOperation({ summary: 'Actualizar fase' })
  updatePhase(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePhaseDto: UpdateProjectPhaseDto,
  ) {
    return this.projectsService.updatePhase(id, updatePhaseDto);
  }

  @Delete('phases/:id')
  @ApiOperation({ summary: 'Eliminar fase' })
  removePhase(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.removePhase(id);
  }

  // --- MILESTONES ---

  @Post('milestones')
  @ApiOperation({ summary: 'Crear un hito' })
  createMilestone(@Body() createMilestoneDto: CreateProjectMilestoneDto) {
    return this.projectsService.createMilestone(createMilestoneDto);
  }

  @Patch('milestones/:id')
  @ApiOperation({ summary: 'Actualizar hito' })
  updateMilestone(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMilestoneDto: UpdateProjectMilestoneDto,
  ) {
    return this.projectsService.updateMilestone(id, updateMilestoneDto);
  }

  @Delete('milestones/:id')
  @ApiOperation({ summary: 'Eliminar hito' })
  removeMilestone(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.removeMilestone(id);
  }

  // --- TASKS ---

  @Post('tasks')
  @ApiOperation({ summary: 'Crear una tarea' })
  createTask(@Body() createTaskDto: CreateProjectTaskDto) {
    return this.projectsService.createTask(createTaskDto);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Actualizar tarea y progreso' })
  updateTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateProjectTaskDto,
  ) {
    return this.projectsService.updateTask(id, updateTaskDto);
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: 'Eliminar tarea' })
  removeTask(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.removeTask(id);
  }

  // --- TIME LOGS (RF4 - Registro de tiempos) ---

  @Post('time-logs')
  @ApiOperation({ summary: 'Registrar tiempo trabajado' })
  createTimeLog(@Body() dto: CreateTimeLogDto) {
    return this.projectsService.createTimeLog(dto);
  }

  @Get(':projectId/time-logs')
  @ApiOperation({ summary: 'Listar registros de tiempo de un proyecto' })
  findTimeLogsByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.projectsService.findTimeLogsByProject(projectId);
  }

  @Get('time-logs/:id')
  @ApiOperation({ summary: 'Obtener un registro de tiempo por ID' })
  findTimeLogById(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findTimeLogById(id);
  }

  @Patch('time-logs/:id')
  @ApiOperation({ summary: 'Actualizar registro de tiempo' })
  updateTimeLog(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTimeLogDto,
  ) {
    return this.projectsService.updateTimeLog(id, dto);
  }

  @Delete('time-logs/:id')
  @ApiOperation({ summary: 'Eliminar registro de tiempo' })
  removeTimeLog(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.removeTimeLog(id);
  }

  // --- PROJECT EXPENSES (RF4 - Registro de gastos) ---

  @Post('expenses')
  @ApiOperation({ summary: 'Registrar un gasto del proyecto' })
  createExpense(@Body() dto: CreateProjectExpenseDto) {
    return this.projectsService.createExpense(dto);
  }

  @Get(':projectId/expenses')
  @ApiOperation({ summary: 'Listar gastos de un proyecto' })
  findExpensesByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.projectsService.findExpensesByProject(projectId);
  }

  @Get('expenses/:id')
  @ApiOperation({ summary: 'Obtener un gasto por ID' })
  findExpenseById(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findExpenseById(id);
  }

  @Patch('expenses/:id')
  @ApiOperation({ summary: 'Actualizar gasto' })
  updateExpense(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectExpenseDto,
  ) {
    return this.projectsService.updateExpense(id, dto);
  }

  @Delete('expenses/:id')
  @ApiOperation({ summary: 'Eliminar gasto' })
  removeExpense(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.removeExpense(id);
  }

  // --- MATERIAL CONSUMPTIONS (RF4 - Consumo real de materiales) ---

  @Post('consumptions')
  @ApiOperation({ summary: 'Registrar consumo real de material' })
  createConsumption(@Body() dto: CreateMaterialConsumptionDto) {
    return this.projectsService.createConsumption(dto);
  }

  @Get(':projectId/consumptions')
  @ApiOperation({ summary: 'Listar consumos de material de un proyecto' })
  findConsumptionsByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.projectsService.findConsumptionsByProject(projectId);
  }

  @Get('consumptions/:id')
  @ApiOperation({ summary: 'Obtener un consumo por ID' })
  findConsumptionById(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findConsumptionById(id);
  }

  @Patch('consumptions/:id')
  @ApiOperation({ summary: 'Actualizar consumo de material' })
  updateConsumption(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaterialConsumptionDto,
  ) {
    return this.projectsService.updateConsumption(id, dto);
  }

  @Delete('consumptions/:id')
  @ApiOperation({ summary: 'Eliminar consumo de material' })
  removeConsumption(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.removeConsumption(id);
  }

  // --- PROJECT UPDATES (RF4 - Novedades del proyecto) ---

  @Post('updates')
  @ApiOperation({ summary: 'Registrar una novedad del proyecto' })
  createUpdate(@Body() dto: CreateProjectUpdateDto) {
    return this.projectsService.createUpdate(dto);
  }

  @Get(':projectId/updates')
  @ApiOperation({ summary: 'Listar novedades de un proyecto' })
  findUpdatesByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.projectsService.findUpdatesByProject(projectId);
  }

  @Get('updates/:id')
  @ApiOperation({ summary: 'Obtener una novedad por ID' })
  findUpdateById(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findUpdateById(id);
  }

  @Patch('updates/:id')
  @ApiOperation({ summary: 'Actualizar novedad' })
  updateUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectUpdateDto,
  ) {
    return this.projectsService.updateUpdate(id, dto);
  }

  @Delete('updates/:id')
  @ApiOperation({ summary: 'Eliminar novedad' })
  removeUpdate(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.removeUpdate(id);
  }
}

