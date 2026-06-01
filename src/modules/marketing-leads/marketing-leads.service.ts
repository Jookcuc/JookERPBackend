import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';
import { MarketingLead } from './entities/marketing-lead.entity';
import { CreateMarketingLeadDto } from './dto/create-marketing-lead.dto';
import { FilterMarketingLeadDto } from './dto/filter-marketing-lead.dto';
import { ImportMarketingLeadsDto } from './dto/import-marketing-leads.dto';
import { UpdateMarketingLeadDto } from './dto/update-marketing-lead.dto';
import {
  DiscoverMarketingLeadsDto,
  LEAD_DISCOVERY_CATEGORIES,
} from './dto/discover-marketing-leads.dto';

type OsmElement = {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
};

const CUCUTA_BBOX = {
  south: 7.8,
  west: -72.62,
  north: 7.98,
  east: -72.43,
};

const OSM_CATEGORY_FILTERS: Record<
  (typeof LEAD_DISCOVERY_CATEGORIES)[number],
  Array<{ key: string; valueRegex: string; label: string }>
> = {
  restaurants: [
    { key: 'amenity', valueRegex: 'restaurant|cafe|fast_food|bar|pub', label: 'Restaurantes' },
  ],
  retail: [{ key: 'shop', valueRegex: 'clothes|shoes|mobile_phone|electronics|furniture|mall|department_store', label: 'Comercio' }],
  pharmacies: [{ key: 'amenity', valueRegex: 'pharmacy', label: 'Droguerias' }],
  supermarkets: [{ key: 'shop', valueRegex: 'supermarket|convenience|greengrocer', label: 'Supermercados' }],
  hardware: [{ key: 'shop', valueRegex: 'hardware|doityourself|paint|trade', label: 'Ferreterias' }],
  beauty: [{ key: 'shop', valueRegex: 'hairdresser|beauty|cosmetics', label: 'Belleza' }],
  hotels: [{ key: 'tourism', valueRegex: 'hotel|guest_house|hostel|apartment', label: 'Hoteles' }],
};

@Injectable()
export class MarketingLeadsService {
  constructor(
    @InjectRepository(MarketingLead)
    private readonly leadRepo: Repository<MarketingLead>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateMarketingLeadDto, user: any): Promise<MarketingLead> {
    await this.ensureUniqueLead(dto, user.companyId);

    const lead = this.leadRepo.create({
      ...dto,
      city: dto.city || 'Cucuta',
      status: 'new',
      consentStatus: dto.consentStatus || 'unknown',
      userId: user.id,
      companyId: user.companyId,
      optOutToken: this.createOptOutToken(),
    });

    return this.leadRepo.save(lead);
  }

  async importMany(dto: ImportMarketingLeadsDto, user: any) {
    const results = {
      created: 0,
      skipped: 0,
      skippedReasons: [] as Array<{ businessName: string; reason: string }>,
    };

    for (const leadDto of dto.leads) {
      try {
        await this.create(leadDto, user);
        results.created += 1;
      } catch (error) {
        results.skipped += 1;
        results.skippedReasons.push({
          businessName: leadDto.businessName,
          reason: error.message,
        });
      }
    }

    return results;
  }

  async discoverFromOpenStreetMap(dto: DiscoverMarketingLeadsDto, user: any) {
    const city = dto.city || 'Cucuta';
    if (!this.isCucuta(city)) {
      throw new BadRequestException(
        'Por ahora el descubrimiento gratuito esta configurado para Cucuta',
      );
    }

    const categories: Array<(typeof LEAD_DISCOVERY_CATEGORIES)[number]> =
      dto.categories?.length
        ? dto.categories
        : ['restaurants', 'hardware', 'supermarkets'];
    const maxResults = dto.maxResults ?? 50;
    const query = this.buildOverpassQuery(categories, maxResults);
    const elements = await this.fetchOverpassElements(query);
    const discovered = elements
      .map((element) => this.mapOsmElementToLead(element, city))
      .filter((lead): lead is CreateMarketingLeadDto => Boolean(lead))
      .slice(0, maxResults);

    const importResult = await this.importMany({ leads: discovered }, user);

    return {
      source: 'openstreetmap_overpass',
      city,
      categories,
      found: elements.length,
      candidatesWithContact: discovered.length,
      ...importResult,
    };
  }

  async findAll(filters: FilterMarketingLeadDto, user: any) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;

    const query = this.leadRepo
      .createQueryBuilder('lead')
      .where('lead.companyId = :companyId', { companyId: user.companyId });

    if (filters.city) {
      query.andWhere('lead.city ILIKE :city', { city: `%${filters.city}%` });
    }

    if (filters.category) {
      query.andWhere('lead.category ILIKE :category', {
        category: `%${filters.category}%`,
      });
    }

    if (filters.status) {
      query.andWhere('lead.status = :status', { status: filters.status });
    }

    if (filters.search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('lead.businessName ILIKE :search', {
            search: `%${filters.search}%`,
          })
            .orWhere('lead.email ILIKE :search', {
              search: `%${filters.search}%`,
            })
            .orWhere('lead.phone ILIKE :search', {
              search: `%${filters.search}%`,
            });
        }),
      );
    }

    const [data, total] = await query
      .orderBy('lead.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number, user: any): Promise<MarketingLead> {
    const lead = await this.leadRepo.findOne({
      where: { id, companyId: user.companyId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead con id ${id} no encontrado`);
    }

    return lead;
  }

  async update(
    id: number,
    dto: UpdateMarketingLeadDto,
    user: any,
  ): Promise<MarketingLead> {
    const lead = await this.findOne(id, user);
    Object.assign(lead, dto);
    return this.leadRepo.save(lead);
  }

  async sendSoftwareInfo(id: number, user: any): Promise<MarketingLead> {
    const lead = await this.findOne(id, user);

    if (!lead.email) {
      throw new BadRequestException('El lead no tiene email registrado');
    }

    if (lead.consentStatus === 'opted_out' || lead.status === 'opted_out') {
      throw new BadRequestException('El lead se dio de baja');
    }

    await this.emailService.sendSoftwareInfoEmail(lead.email, {
      businessName: lead.businessName,
      contactName: lead.contactName,
      city: lead.city,
      category: lead.category,
      unsubscribeUrl: this.getUnsubscribeUrl(lead),
    });

    lead.status = 'contacted';
    lead.lastContactedAt = new Date();
    lead.contactAttempts += 1;

    return this.leadRepo.save(lead);
  }

  async sendSoftwareInfoBatch(leadIds: number[], user: any) {
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as Array<{ leadId: number; reason: string }>,
    };

    for (const leadId of leadIds) {
      try {
        await this.sendSoftwareInfo(leadId, user);
        results.sent += 1;
      } catch (error) {
        results.failed += 1;
        results.errors.push({ leadId, reason: error.message });
      }
    }

    return results;
  }

  async optOut(token: string) {
    const lead = await this.leadRepo.findOne({ where: { optOutToken: token } });

    if (!lead) {
      throw new NotFoundException('Solicitud de baja no encontrada');
    }

    lead.status = 'opted_out';
    lead.consentStatus = 'opted_out';
    await this.leadRepo.save(lead);

    return {
      message: 'Tu correo fue retirado de futuras comunicaciones de Jook ERP.',
    };
  }

  private async ensureUniqueLead(dto: CreateMarketingLeadDto, companyId: number) {
    if (!dto.email && !dto.phone) return;

    const query = this.leadRepo
      .createQueryBuilder('lead')
      .where('lead.companyId = :companyId', { companyId });

    if (dto.email && dto.phone) {
      query.andWhere('(LOWER(lead.email) = LOWER(:email) OR lead.phone = :phone)', {
        email: dto.email,
        phone: dto.phone,
      });
    } else if (dto.email) {
      query.andWhere('LOWER(lead.email) = LOWER(:email)', { email: dto.email });
    } else if (dto.phone) {
      query.andWhere('lead.phone = :phone', { phone: dto.phone });
    }

    const existing = await query.getOne();
    if (existing) {
      throw new BadRequestException('Ya existe un lead con ese email o telefono');
    }
  }

  private getUnsubscribeUrl(lead: MarketingLead): string {
    const apiUrl =
      this.configService.get<string>('APP_URL') ||
      this.configService.get<string>('RAILWAY_PUBLIC_DOMAIN') ||
      'https://jookerpbackend-production.up.railway.app';
    const normalizedApiUrl = apiUrl.startsWith('http') ? apiUrl : `https://${apiUrl}`;

    return `${normalizedApiUrl}/api/v1/marketing-leads/unsubscribe/${lead.optOutToken}`;
  }

  private createOptOutToken(): string {
    return randomBytes(24).toString('hex');
  }

  private buildOverpassQuery(
    categories: Array<(typeof LEAD_DISCOVERY_CATEGORIES)[number]>,
    maxResults: number,
  ): string {
    const bbox = `${CUCUTA_BBOX.south},${CUCUTA_BBOX.west},${CUCUTA_BBOX.north},${CUCUTA_BBOX.east}`;
    const filters = categories.flatMap((category) => OSM_CATEGORY_FILTERS[category]);
    const selectors = filters
      .map(
        (filter) =>
          `nwr["${filter.key}"~"^(${filter.valueRegex})$"](${bbox});`,
      )
      .join('\n');

    return `
      [out:json][timeout:25];
      (
        ${selectors}
      );
      out center ${Math.min(maxResults * 3, 300)};
    `;
  }

  private async fetchOverpassElements(query: string): Promise<OsmElement[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'JookERPLeadDiscovery/1.0',
        },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new BadRequestException(
          `Overpass respondio con estado ${response.status}`,
        );
      }

      const data = await response.json();
      return Array.isArray(data.elements) ? data.elements : [];
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new BadRequestException('Overpass tardo demasiado en responder');
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapOsmElementToLead(
    element: OsmElement,
    city: string,
  ): CreateMarketingLeadDto | null {
    const tags = element.tags || {};
    const businessName = tags.name?.trim();
    if (!businessName) return null;

    const email = this.firstNonEmpty(tags['contact:email'], tags.email);
    const phone = this.firstNonEmpty(
      tags['contact:phone'],
      tags.phone,
      tags['contact:mobile'],
      tags.mobile,
    );
    const website = this.firstNonEmpty(
      tags['contact:website'],
      tags.website,
      tags.url,
    );

    if (!email && !phone && !website) return null;

    return {
      businessName,
      email,
      phone,
      website,
      city,
      category: this.getOsmCategory(tags),
      address: this.getOsmAddress(tags),
      source: 'openstreetmap_overpass',
      sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      consentStatus: email ? 'corporate_public' : 'unknown',
      notes: 'Lead descubierto desde datos publicos de OpenStreetMap. Revisar antes de contactar.',
    };
  }

  private getOsmCategory(tags: Record<string, string>): string {
    for (const filters of Object.values(OSM_CATEGORY_FILTERS)) {
      for (const filter of filters) {
        if (tags[filter.key] && new RegExp(`^(${filter.valueRegex})$`).test(tags[filter.key])) {
          return filter.label;
        }
      }
    }

    return 'Negocio';
  }

  private getOsmAddress(tags: Record<string, string>): string | undefined {
    const parts = [
      tags['addr:street'],
      tags['addr:housenumber'],
      tags['addr:neighbourhood'],
    ].filter(Boolean);

    return parts.length ? parts.join(' ') : undefined;
  }

  private firstNonEmpty(...values: Array<string | undefined>): string | undefined {
    return values.find((value) => value?.trim())?.trim();
  }

  private isCucuta(city: string): boolean {
    return ['cucuta', 'cúcuta'].includes(city.trim().toLowerCase());
  }
}
