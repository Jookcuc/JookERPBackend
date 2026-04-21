import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessLog } from '../entities/access-log.entity';
import { MaintenanceTicket, TicketStatus } from '../entities/maintenance-ticket.entity';
import { Communication } from '../entities/communication.entity';

@Injectable()
export class OperationService {
  constructor(
    @InjectRepository(AccessLog)
    private readonly accessLogRepository: Repository<AccessLog>,
    @InjectRepository(MaintenanceTicket)
    private readonly ticketRepository: Repository<MaintenanceTicket>,
    @InjectRepository(Communication)
    private readonly communicationRepository: Repository<Communication>,
  ) {}

  // --- Access Control ---
  async registerEntry(propertyUnitId: number, visitorName: string, document?: string, plate?: string) {
    const entry = this.accessLogRepository.create({
      propertyUnitId,
      visitorName,
      visitorDocument: document,
      vehiclePlate: plate,
      entryTime: new Date(),
    });
    return await this.accessLogRepository.save(entry);
  }

  async registerExit(logId: number) {
    return await this.accessLogRepository.update(logId, {
      exitTime: new Date(),
    });
  }

  // --- Maintenance / PQRS ---
  async createTicket(ticketData: Partial<MaintenanceTicket>) {
    const ticket = this.ticketRepository.create(ticketData);
    return await this.ticketRepository.save(ticket);
  }

  async updateTicketStatus(ticketId: number, status: TicketStatus) {
    return await this.ticketRepository.update(ticketId, { status });
  }

  // --- Communications ---
  async createCommunication(condominiumId: number, title: string, content: string, type: any) {
    const comm = this.communicationRepository.create({
      condominiumId,
      title,
      content,
      type,
    });
    return await this.communicationRepository.save(comm);
  }

  async getActiveCommunications(condominiumId: number) {
    return await this.communicationRepository.find({
      where: { condominiumId, isPublished: true },
      order: { publishedAt: 'DESC' },
    });
  }

  // --- Common Areas ---
  async getCommonAreas(condominiumId: number) {
    return await this.accessLogRepository.manager.find('CommonArea', {
      where: { condominiumId, isActive: true },
    });
  }

  // --- Document Management ---
  async getDocuments(condominiumId: number) {
    return await this.accessLogRepository.manager.find('CondoDocument', {
      where: { condominiumId },
    });
  }
}
