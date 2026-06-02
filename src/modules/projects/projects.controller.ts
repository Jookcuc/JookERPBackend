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
}
