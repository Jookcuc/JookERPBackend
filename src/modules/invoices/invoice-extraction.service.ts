import {
  AnalyzeExpenseCommand,
  type AnalyzeExpenseCommandOutput,
  type AnalyzeExpenseCommandInput,
  type ExpenseDocument,
  type ExpenseField,
  TextractClient,
} from '@aws-sdk/client-textract';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractInvoiceDto } from './dto/extract-invoice.dto';
import { Contact, ContactType } from './entities/contact.entity';
import { InvoiceType } from './entities/invoice.entity';

type SupportedField =
  | 'supplierName'
  | 'invoiceNumber'
  | 'issueDate'
  | 'dueDate'
  | 'totalAmount'
  | 'paymentConditions';

interface NormalizedExpenseField {
  typeText: string;
  labelText: string;
  valueText: string;
  confidence: number | null;
}

interface ExtractedInvoiceLineItem {
  description: string | null;
  quantity: number | null;
  unitPrice: number | null;
  totalAmount: number | null;
}

interface AuthenticatedUserLike {
  id: number;
  role: number;
  companyId: number;
}

export interface ExtractedInvoiceResponse {
  invoiceType: InvoiceType;
  supplierId: number | null;
  supplierName: string | null;
  clientId: number | null;
  clientName: string | null;
  contactId: number | null;
  contactName: string | null;
  invoiceNumber: string | null;
  issueDate: string | null;
  dueDate: string | null;
  totalAmount: number | null;
  paymentConditions: string | null;
  items: ExtractedInvoiceLineItem[];
  confidence: Partial<Record<SupportedField, number>>;
  warnings: string[];
  rawText: string | null;
}

@Injectable()
export class InvoiceExtractionService {
  private readonly logger = new Logger(InvoiceExtractionService.name);
  private readonly textractClient: TextractClient;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
  ) {
    const region = this.configService.get<string>('AWS_REGION', 'us-east-2');

    this.textractClient = new TextractClient({
      region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey:
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  async extractInvoice(
    dto: ExtractInvoiceDto,
    user: AuthenticatedUserLike,
  ): Promise<ExtractedInvoiceResponse> {
    const document = await this.buildTextractDocument(dto.voucherUrl);

    let response: AnalyzeExpenseCommandOutput;
    try {
      response = await this.textractClient.send(
        new AnalyzeExpenseCommand({
          Document: document,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error analizando factura ${dto.fileName ?? dto.voucherUrl}: ${message}`,
      );
      throw new ServiceUnavailableException(
        `No se pudo analizar la factura con Textract: ${message}`,
      );
    }

    const expenseDocument = response.ExpenseDocuments?.[0];
    if (!expenseDocument) {
      return {
        invoiceType: dto.invoiceType,
        supplierId: null,
        supplierName: null,
        clientId: null,
        clientName: null,
        contactId: null,
        contactName: null,
        invoiceNumber: null,
        issueDate: null,
        dueDate: null,
        totalAmount: null,
        paymentConditions: null,
        items: [],
        confidence: {},
        warnings: [
          'No se detectaron datos estructurados en la factura. Intenta con una imagen mas clara.',
        ],
        rawText: null,
      };
    }

    const summaryFields = this.normalizeSummaryFields(
      expenseDocument.SummaryFields ?? [],
    );
    const rawText = this.buildRawText(expenseDocument);

    const supplierField = this.findBestField(summaryFields, {
      exactTypes: ['vendorname'],
      typeHints: ['suppliername', 'vendor'],
      labelHints: ['proveedor', 'supplier', 'vendor', 'emisor'],
    });
    const invoiceNumberField = this.findBestField(summaryFields, {
      exactTypes: ['invoicereceiptid'],
      typeHints: ['invoicenumber', 'receiptid', 'receiptnumber'],
      labelHints: ['factura', 'invoice', 'numero', 'nro', 'documento'],
    });
    const issueDateField = this.findBestField(summaryFields, {
      exactTypes: ['invoicereceiptdate'],
      typeHints: ['issuedate', 'invoicedate'],
      labelHints: ['fecha', 'emision', 'issue'],
    });
    const dueDateField = this.findBestField(summaryFields, {
      exactTypes: ['duedate'],
      typeHints: ['due'],
      labelHints: ['vencimiento', 'vence', 'due'],
    });
    const totalAmountField = this.findBestField(summaryFields, {
      exactTypes: ['total', 'amountdue'],
      typeHints: ['total', 'amountdue', 'balance'],
      labelHints: ['total', 'monto', 'importe', 'balance'],
    });
    const paymentConditionsField = this.findBestField(summaryFields, {
      exactTypes: ['paymentterms'],
      typeHints: ['paymentterms', 'paymentcondition', 'terms'],
      labelHints: ['condiciones', 'terminos', 'pago', 'credito'],
    });

    const extractedName = this.cleanText(supplierField?.valueText);
    const matchedContact = extractedName
      ? await this.findBestContactMatch(extractedName, dto.invoiceType, user)
      : null;

    const invoiceNumber = this.cleanText(invoiceNumberField?.valueText);
    const issueDate = this.normalizeDate(issueDateField?.valueText);
    const dueDate = this.normalizeDate(dueDateField?.valueText);
    const totalAmount = this.parseLooseAmount(totalAmountField?.valueText);
    const paymentConditions = this.cleanText(paymentConditionsField?.valueText);
    const items = this.extractLineItems(expenseDocument);

    const warnings: string[] = [];

    if (!extractedName) {
      warnings.push('No se detecto el nombre del proveedor o emisor.');
    } else if (!matchedContact) {
      warnings.push(
        `Se detecto "${extractedName}", pero no se encontro coincidencia con tus contactos.`,
      );
    }

    if (!invoiceNumber) {
      warnings.push('No se detecto el numero de factura.');
    }

    if (!issueDate) {
      warnings.push('No se detecto la fecha de emision.');
    }

    if (totalAmount === null) {
      warnings.push('No se detecto el monto total.');
    }

    return {
      invoiceType: dto.invoiceType,
      supplierId:
        dto.invoiceType === InvoiceType.COMPRA
          ? (matchedContact?.id ?? null)
          : null,
      supplierName:
        dto.invoiceType === InvoiceType.COMPRA
          ? (matchedContact?.name ?? extractedName ?? null)
          : null,
      clientId:
        dto.invoiceType === InvoiceType.VENTA
          ? (matchedContact?.id ?? null)
          : null,
      clientName:
        dto.invoiceType === InvoiceType.VENTA
          ? (matchedContact?.name ?? extractedName ?? null)
          : null,
      contactId: matchedContact?.id ?? null,
      contactName: matchedContact?.name ?? extractedName ?? null,
      invoiceNumber,
      issueDate,
      dueDate,
      totalAmount,
      paymentConditions,
      items,
      confidence: {
        supplierName: supplierField?.confidence ?? undefined,
        invoiceNumber: invoiceNumberField?.confidence ?? undefined,
        issueDate: issueDateField?.confidence ?? undefined,
        dueDate: dueDateField?.confidence ?? undefined,
        totalAmount: totalAmountField?.confidence ?? undefined,
        paymentConditions: paymentConditionsField?.confidence ?? undefined,
      },
      warnings,
      rawText,
    };
  }

  private async buildTextractDocument(
    voucherUrl: string,
  ): Promise<NonNullable<AnalyzeExpenseCommandInput['Document']>> {
    const s3Reference = this.parseS3Reference(voucherUrl);
    if (s3Reference) {
      return {
        S3Object: {
          Bucket: s3Reference.bucket,
          Name: s3Reference.key,
        },
      };
    }

    let response: Response;
    try {
      response = await fetch(voucherUrl);
    } catch {
      throw new BadRequestException(
        'No se pudo acceder a la URL de la factura para analizarla',
      );
    }

    if (!response.ok) {
      throw new BadRequestException(
        `La URL de la factura respondio con estado ${response.status}`,
      );
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0) {
      throw new BadRequestException(
        'La factura no contiene datos para analizar',
      );
    }

    return {
      Bytes: bytes,
    };
  }

  private parseS3Reference(voucherUrl: string): {
    bucket: string;
    key: string;
  } | null {
    try {
      const parsedUrl = new URL(voucherUrl);
      const host = parsedUrl.hostname.toLowerCase();
      const keyFromPath = decodeURIComponent(
        parsedUrl.pathname.replace(/^\/+/, ''),
      );

      if (!keyFromPath) {
        return null;
      }

      if (host.includes('.s3.') && host.endsWith('.amazonaws.com')) {
        const bucket = host.split('.s3.')[0];
        return bucket ? { bucket, key: keyFromPath } : null;
      }

      if (host.startsWith('s3.') && host.endsWith('.amazonaws.com')) {
        const [bucket, ...rest] = keyFromPath.split('/');
        if (!bucket || rest.length === 0) {
          return null;
        }
        return {
          bucket,
          key: rest.join('/'),
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  private normalizeSummaryFields(
    fields: ExpenseField[],
  ): NormalizedExpenseField[] {
    return fields
      .map((field) => ({
        typeText: this.normalizeToken(field?.Type?.Text),
        labelText: this.normalizeToken(field?.LabelDetection?.Text),
        valueText: this.cleanText(field?.ValueDetection?.Text) ?? '',
        confidence: this.resolveConfidence(field),
      }))
      .filter((field) => Boolean(field.valueText));
  }

  private findBestField(
    fields: NormalizedExpenseField[],
    options: {
      exactTypes?: string[];
      typeHints?: string[];
      labelHints?: string[];
    },
  ): NormalizedExpenseField | null {
    const { exactTypes = [], typeHints = [], labelHints = [] } = options;

    const scored = fields
      .map((field) => {
        let score = 0;

        if (exactTypes.includes(field.typeText)) {
          score += 100;
        }

        if (typeHints.some((hint) => field.typeText.includes(hint))) {
          score += 60;
        }

        if (labelHints.some((hint) => field.labelText.includes(hint))) {
          score += 40;
        }

        return { field, score };
      })
      .filter((item) => item.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return (right.field.confidence ?? 0) - (left.field.confidence ?? 0);
      });

    return scored[0]?.field ?? null;
  }

  private extractLineItems(
    expenseDocument: ExpenseDocument,
  ): ExtractedInvoiceLineItem[] {
    const groups = expenseDocument.LineItemGroups ?? [];

    return groups.flatMap((group) => {
      const items = group.LineItems ?? [];

      return items
        .map((item) => {
          const fields = this.normalizeSummaryFields(
            item.LineItemExpenseFields ?? [],
          );

          const descriptionField =
            this.findBestField(fields, {
              exactTypes: ['item', 'description'],
              typeHints: ['item', 'description'],
              labelHints: ['descripcion', 'producto', 'item'],
            }) ?? null;

          const quantityField = this.findBestField(fields, {
            exactTypes: ['quantity'],
            typeHints: ['quantity'],
            labelHints: ['cantidad', 'qty'],
          });

          const unitPriceField = this.findBestField(fields, {
            exactTypes: ['price'],
            typeHints: ['price', 'unitprice'],
            labelHints: ['precio', 'valor unitario', 'unit price'],
          });

          const totalField = this.findBestField(fields, {
            exactTypes: ['total'],
            typeHints: ['total', 'amount'],
            labelHints: ['total', 'subtotal'],
          });

          const description = this.cleanText(descriptionField?.valueText);
          const quantity = this.parseLooseAmount(quantityField?.valueText);
          const unitPrice = this.parseLooseAmount(unitPriceField?.valueText);
          const totalAmount = this.parseLooseAmount(totalField?.valueText);

          if (!description && quantity === null && unitPrice === null) {
            return null;
          }

          return {
            description,
            quantity,
            unitPrice,
            totalAmount,
          };
        })
        .filter((item): item is ExtractedInvoiceLineItem => item !== null);
    });
  }

  private buildRawText(expenseDocument: ExpenseDocument): string | null {
    const snippets = new Set<string>();

    const summaryFields = expenseDocument.SummaryFields ?? [];
    for (const field of summaryFields) {
      const label = this.cleanText(field?.LabelDetection?.Text);
      const value = this.cleanText(field?.ValueDetection?.Text);

      if (label && value) {
        snippets.add(`${label}: ${value}`);
      } else if (value) {
        snippets.add(value);
      }
    }

    const lineItemGroups = expenseDocument.LineItemGroups ?? [];
    for (const group of lineItemGroups) {
      const lineItems = group.LineItems ?? [];
      for (const lineItem of lineItems) {
        const fields = lineItem.LineItemExpenseFields ?? [];
        for (const field of fields) {
          const value = this.cleanText(field?.ValueDetection?.Text);
          if (value) {
            snippets.add(value);
          }
        }
      }
    }

    const rawText = [...snippets].join('\n').trim();
    return rawText || null;
  }

  private async findBestContactMatch(
    extractedName: string,
    invoiceType: InvoiceType,
    user: AuthenticatedUserLike,
  ): Promise<Contact | null> {
    const type =
      invoiceType === InvoiceType.COMPRA
        ? ContactType.PROVEEDOR
        : ContactType.CLIENTE;

    const where: Partial<Contact> & { companyId: number; userId?: number } = {
      companyId: user.companyId,
      type,
    };

    if (user.role === 2) {
      where.userId = user.id;
    }

    const contacts = await this.contactRepo.find({
      where,
      select: ['id', 'name', 'type'],
      order: { name: 'ASC' },
    });

    const normalizedTarget = this.normalizeToken(extractedName);
    if (!normalizedTarget) {
      return null;
    }

    return (
      contacts.find(
        (contact) => this.normalizeToken(contact.name) === normalizedTarget,
      ) ??
      contacts.find((contact) => {
        const normalizedName = this.normalizeToken(contact.name);
        return (
          normalizedName.includes(normalizedTarget) ||
          normalizedTarget.includes(normalizedName)
        );
      }) ??
      null
    );
  }

  private resolveConfidence(field: ExpenseField): number | null {
    const candidates = [
      field?.ValueDetection?.Confidence,
      field?.Type?.Confidence,
      field?.LabelDetection?.Confidence,
    ].filter((value) => typeof value === 'number');

    if (candidates.length === 0) {
      return null;
    }

    return Math.round(Math.max(...candidates) * 100) / 100;
  }

  private cleanText(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const cleaned = value.replace(/\s+/g, ' ').trim();
    return cleaned || null;
  }

  private normalizeToken(value?: string | null): string {
    return (
      value
        ?.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') ?? ''
    );
  }

  private normalizeDate(value?: string | null): string | null {
    const cleaned = this.cleanText(value);
    if (!cleaned) {
      return null;
    }

    const isoMatch = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const latamMatch = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (latamMatch) {
      const [, day, month, year] = latamMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const parsed = new Date(cleaned);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseLooseAmount(value?: string | null): number | null {
    const cleaned = this.cleanText(value);
    if (!cleaned) {
      return null;
    }

    const normalizedInput = cleaned.replace(/[^\d,.-]/g, '');
    if (!normalizedInput) {
      return null;
    }

    const lastDot = normalizedInput.lastIndexOf('.');
    const lastComma = normalizedInput.lastIndexOf(',');
    let normalized = normalizedInput;

    if (lastDot !== -1 && lastComma !== -1) {
      const decimalSeparator = lastDot > lastComma ? '.' : ',';
      const thousandSeparator = decimalSeparator === '.' ? ',' : '.';
      normalized = normalizedInput
        .replace(new RegExp(`\\${thousandSeparator}`, 'g'), '')
        .replace(decimalSeparator, '.');
    } else if (lastComma !== -1) {
      const decimalPlaces = normalizedInput.length - lastComma - 1;
      normalized =
        decimalPlaces > 0 && decimalPlaces <= 2
          ? normalizedInput.replace(/\./g, '').replace(',', '.')
          : normalizedInput.replace(/,/g, '');
    } else if (lastDot !== -1) {
      const decimalPlaces = normalizedInput.length - lastDot - 1;
      normalized =
        decimalPlaces > 0 && decimalPlaces <= 2
          ? normalizedInput.replace(/,/g, '')
          : normalizedInput.replace(/\./g, '');
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
