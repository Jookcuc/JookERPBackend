import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as qrcode from 'qrcode';
import {
  Between,
  ILike,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { S3Service } from '../s3/s3.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { FilterDiscountDto } from './dto/filter-discount.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { FilterProductTypeDto } from './dto/filter-product-type.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { Discount } from './entities/discount.entity';
import { Product } from './entities/product.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';
import { ProductType } from './entities/product-type.entity';

type ProductQrResponse = {
  qrCode: string;
  productUrl: string;
  qrCodeUrl: string;
  qrCodeKey: string;
  downloadUrl: string;
  downloadUrlExpiresAt: string;
};

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(ProductType)
    private readonly typeRepo: Repository<ProductType>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Discount)
    private readonly discountRepo: Repository<Discount>,
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {}

  async createType(dto: CreateProductTypeDto, user: any): Promise<ProductType> {
    const existing = await this.typeRepo.findOne({
      where: { code: dto.code, companyId: user.companyId },
    });

    if (existing) {
      throw new ConflictException(`El codigo ${dto.code} ya existe`);
    }

    const type = this.typeRepo.create({
      ...dto,
      userId: user.id,
      companyId: user.companyId,
    });

    return this.typeRepo.save(type);
  }

  async findAllTypes(filters: FilterProductTypeDto, user: any) {
    const { name, code, startDate, endDate } = filters;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 5;
    const skip = (page - 1) * limit;

    const where: any = { companyId: user.companyId };

    if (user.role === 2) where.userId = user.id;
    if (name) where.name = ILike(`%${name}%`);
    if (code) where.code = ILike(`%${code}%`);
    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      where.createdAt = MoreThanOrEqual(new Date(startDate));
    } else if (endDate) {
      where.createdAt = LessThanOrEqual(new Date(endDate));
    }

    const [data, total] = await this.typeRepo.findAndCount({
      where,
      relations: ['products'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const mapped = data.map((type) => ({
      id: type.id,
      code: type.code,
      name: type.name,
      createdAt: type.createdAt,
      totalStock:
        type.products?.reduce((acc, product) => acc + product.stock, 0) ?? 0,
    }));

    return {
      data: mapped,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAllTypesList(user: any) {
    const where: any = { companyId: user.companyId };
    if (user.role === 2) where.userId = user.id;

    return this.typeRepo.find({
      where,
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });
  }

  async updateType(
    id: number,
    dto: UpdateProductTypeDto,
    user: any,
  ): Promise<ProductType> {
    const type = await this.typeRepo.findOne({
      where: { id, companyId: user.companyId },
    });

    if (!type) {
      throw new NotFoundException(`Tipo con id ${id} no encontrado`);
    }

    if (dto.code && dto.code !== type.code) {
      const codeExists = await this.typeRepo.findOne({
        where: { code: dto.code, companyId: user.companyId },
      });

      if (codeExists) {
        throw new ConflictException(`El codigo ${dto.code} ya esta en uso`);
      }
    }

    Object.assign(type, dto);
    return this.typeRepo.save(type);
  }

  async removeType(id: number, user: any): Promise<{ message: string }> {
    const type = await this.typeRepo.findOne({
      where: { id, companyId: user.companyId },
      relations: ['products'],
    });

    if (!type) {
      throw new NotFoundException(`Tipo con id ${id} no encontrado`);
    }

    if (type.products?.length > 0) {
      throw new ConflictException(
        `No se puede eliminar el tipo porque tiene ${type.products.length} producto(s) asociado(s)`,
      );
    }

    await this.typeRepo.remove(type);
    return { message: `Tipo "${type.name}" eliminado correctamente` };
  }

  async createDiscount(dto: CreateDiscountDto, user: any): Promise<Discount> {
    await this.ensureDiscountNameAvailable(dto.name, user.companyId);

    const discount = this.discountRepo.create({
      ...dto,
      companyId: user.companyId,
      userId: user.id,
      isActive: dto.isActive ?? true,
    });

    return this.discountRepo.save(discount);
  }

  async findAllDiscounts(filters: FilterDiscountDto, user: any) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.discountRepo
      .createQueryBuilder('discount')
      .where('discount.company_id = :companyId', {
        companyId: user.companyId,
      })
      .orderBy('discount.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (filters.name) {
      qb.andWhere('discount.name ILIKE :name', {
        name: `%${filters.name}%`,
      });
    }

    if (filters.isActive !== undefined) {
      qb.andWhere('discount.is_active = :isActive', {
        isActive: filters.isActive,
      });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAllDiscountsList(
    user: any,
  ): Promise<Array<Pick<Discount, 'id' | 'name' | 'percentage' | 'isActive'>>> {
    return this.discountRepo.find({
      where: {
        companyId: user.companyId,
        isActive: true,
      },
      select: ['id', 'name', 'percentage', 'isActive'],
      order: { name: 'ASC' },
    });
  }

  async findOneDiscount(id: number, user: any): Promise<Discount> {
    const discount = await this.discountRepo.findOne({
      where: { id, companyId: user.companyId },
    });

    if (!discount) {
      throw new NotFoundException(`Descuento con id ${id} no encontrado`);
    }

    return discount;
  }

  async updateDiscount(
    id: number,
    dto: UpdateDiscountDto,
    user: any,
  ): Promise<Discount> {
    const discount = await this.findOneDiscount(id, user);

    if (
      dto.name &&
      dto.name.trim().toLowerCase() !== discount.name.trim().toLowerCase()
    ) {
      await this.ensureDiscountNameAvailable(dto.name, user.companyId, id);
    }

    Object.assign(discount, dto);
    return this.discountRepo.save(discount);
  }

  async removeDiscount(id: number, user: any): Promise<{ message: string }> {
    const discount = await this.discountRepo.findOne({
      where: { id, companyId: user.companyId },
      relations: ['products'],
    });

    if (!discount) {
      throw new NotFoundException(`Descuento con id ${id} no encontrado`);
    }

    if (discount.products?.length > 0) {
      throw new ConflictException(
        `No se puede eliminar el descuento porque tiene ${discount.products.length} producto(s) asociado(s)`,
      );
    }

    await this.discountRepo.remove(discount);
    return { message: `Descuento "${discount.name}" eliminado correctamente` };
  }

  async createProduct(
    dto: CreateProductDto,
    user: any,
  ): Promise<Product & Partial<ProductQrResponse>> {
    const typeExists = await this.typeRepo.findOne({
      where: { id: dto.typeId, companyId: user.companyId },
    });

    if (!typeExists) {
      throw new NotFoundException(`Tipo con id ${dto.typeId} no encontrado`);
    }

    const existing = await this.productRepo.findOne({
      where: { code: dto.code, companyId: user.companyId },
    });

    if (existing) {
      throw new ConflictException(
        `El codigo de producto ${dto.code} ya existe`,
      );
    }

    const selectedDiscount = await this.resolveDiscountForProduct(
      dto.discountId,
      user.companyId,
    );

    const product = this.productRepo.create({
      ...dto,
      discountId: selectedDiscount?.id ?? null,
      discount: this.buildLegacyDiscountValue(selectedDiscount, dto.discount),
      userId: user.id,
      companyId: user.companyId,
    });
    const savedProduct = await this.productRepo.save(product);
    const productWithRelations = await this.findOneProduct(
      savedProduct.id,
      user,
    );

    try {
      const qrCodeData =
        await this.buildProductQrResponse(productWithRelations);
      return Object.assign(productWithRelations, qrCodeData);
    } catch (error) {
      console.error('Error generating QR code for product', error);
      return Object.assign(productWithRelations, {
        productUrl: this.buildProductDetailUrl(productWithRelations.id),
      });
    }
  }

  async findAllProducts(filters: FilterProductDto, user: any) {
    const { name, code, minPrice, maxPrice, typeId, startDate, endDate } =
      filters;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 5;
    const skip = (page - 1) * limit;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.type', 'type')
      .leftJoinAndSelect('p.discountCatalog', 'discountCatalog')
      .skip(skip)
      .take(limit)
      .orderBy('p.createdAt', 'DESC')
      .andWhere('p.company_id = :companyId', { companyId: user.companyId });

    if (user.role === 2) {
      qb.andWhere('p.user_id = :userId', { userId: user.id });
    }
    if (name) qb.andWhere('p.name ILIKE :name', { name: `%${name}%` });
    if (code) qb.andWhere('p.code ILIKE :code', { code: `%${code}%` });
    if (typeId) qb.andWhere('p.type_id = :typeId', { typeId });
    if (minPrice !== undefined) {
      qb.andWhere('p.sale_price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      qb.andWhere('p.sale_price <= :maxPrice', { maxPrice });
    }
    if (startDate) qb.andWhere('p.entry_date >= :startDate', { startDate });
    if (endDate) qb.andWhere('p.entry_date <= :endDate', { endDate });

    const [data, total] = await qb.getManyAndCount();
    const kpis = await this.getKpis(user);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      kpis,
    };
  }

  async findAllProductsList(
    user: any,
  ): Promise<Array<Pick<Product, 'id' | 'name'>>> {
    const where: any = { companyId: user.companyId };
    if (user.role === 2) where.userId = user.id;

    return this.productRepo.find({
      where,
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });
  }

  async findOneProduct(id: number, user: any): Promise<Product> {
    const where: any = { id, companyId: user.companyId };
    if (user.role === 2) where.userId = user.id;

    const product = await this.productRepo.findOne({
      where,
      relations: ['type', 'discountCatalog'],
    });

    if (!product) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }

    return product;
  }

  async getProductQr(id: number, user: any): Promise<ProductQrResponse> {
    const product = await this.findOneProduct(id, user);
    return this.buildProductQrResponse(product);
  }

  async downloadProductQr(
    id: number,
    user: any,
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    const product = await this.findOneProduct(id, user);
    const qrAsset = await this.syncProductQrAsset(product);

    return this.s3Service.generateDownloadUrl(
      qrAsset.qrCodeKey,
      qrAsset.fileName,
    );
  }

  async updateProduct(
    id: number,
    dto: UpdateProductDto,
    user: any,
  ): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id, companyId: user.companyId },
    });

    if (!product) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }

    if (dto.typeId) {
      const typeExists = await this.typeRepo.findOne({
        where: { id: dto.typeId, companyId: user.companyId },
      });

      if (!typeExists) {
        throw new NotFoundException(`Tipo con id ${dto.typeId} no encontrado`);
      }
    }

    if (dto.code && dto.code !== product.code) {
      const codeExists = await this.productRepo.findOne({
        where: { code: dto.code, companyId: user.companyId },
      });

      if (codeExists) {
        throw new ConflictException(`El codigo ${dto.code} ya esta en uso`);
      }
    }

    const { discountId, discount, ...rest } = dto;
    Object.assign(product, rest);

    if (discountId !== undefined) {
      const selectedDiscount = await this.resolveDiscountForProduct(
        discountId,
        user.companyId,
      );
      product.discountId = selectedDiscount?.id ?? null;
      product.discount = this.buildLegacyDiscountValue(
        selectedDiscount,
        discount,
      );
    } else if (discount !== undefined) {
      product.discount = discount?.trim() || 'No aplica';
    }

    await this.productRepo.save(product);
    return this.findOneProduct(id, user);
  }

  async removeProduct(id: number, user: any): Promise<{ message: string }> {
    const product = await this.productRepo.findOne({
      where: { id, companyId: user.companyId },
    });

    if (!product) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }

    await this.s3Service.deleteFile(this.buildProductQrKey(product));
    await this.productRepo.remove(product);

    return { message: `Producto "${product.name}" eliminado correctamente` };
  }

  private async getKpis(user: any) {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .andWhere('p.company_id = :companyId', { companyId: user.companyId });

    if (user.role === 2) {
      qb.andWhere('p.user_id = :userId', { userId: user.id });
    }

    const allProducts = await qb.getMany();

    return {
      totalProducts: allProducts.length,
      totalCost: +allProducts
        .reduce((acc, product) => acc + Number(product.cost) * product.stock, 0)
        .toFixed(2),
      totalRetailValue: +allProducts
        .reduce(
          (acc, product) => acc + Number(product.salePrice) * product.stock,
          0,
        )
        .toFixed(2),
      outOfStock: allProducts.filter((product) => product.stock === 0).length,
      lowStock: allProducts.filter(
        (product) => product.stock > 0 && product.stock <= product.minStock,
      ).length,
    };
  }

  private buildProductDetailUrl(productId: number): string {
    return new URL(
      `/es/inventory/detail/${productId}`,
      this.getProductQrBaseUrl(),
    ).toString();
  }

  private async buildProductQrResponse(
    product: Product,
  ): Promise<ProductQrResponse> {
    const qrAsset = await this.syncProductQrAsset(product);
    const { downloadUrl, expiresAt } = await this.s3Service.generateDownloadUrl(
      qrAsset.qrCodeKey,
      qrAsset.fileName,
    );

    return {
      qrCode: this.bufferToDataUrl(qrAsset.image),
      productUrl: qrAsset.productUrl,
      qrCodeUrl: qrAsset.qrCodeUrl,
      qrCodeKey: qrAsset.qrCodeKey,
      downloadUrl,
      downloadUrlExpiresAt: expiresAt,
    };
  }

  private async syncProductQrAsset(product: Product): Promise<{
    productUrl: string;
    qrCodeKey: string;
    qrCodeUrl: string;
    fileName: string;
    image: Buffer;
  }> {
    const productUrl = this.buildProductDetailUrl(product.id);
    const image = await this.generateProductQrBuffer(productUrl);
    const qrCodeKey = this.buildProductQrKey(product);
    const fileName = this.buildQrFileName(product);
    const uploadedQr = await this.s3Service.uploadFile({
      key: qrCodeKey,
      body: image,
      contentType: 'image/png',
    });

    return {
      productUrl,
      qrCodeKey: uploadedQr.key,
      qrCodeUrl: uploadedQr.fileUrl,
      fileName,
      image,
    };
  }

  private getProductQrBaseUrl(): string {
    const configuredBaseUrl =
      this.configService.get<string>('PRODUCT_QR_BASE_URL') ||
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:3000';

    try {
      return new URL(configuredBaseUrl).toString();
    } catch {
      return 'http://localhost:3000/';
    }
  }

  private generateProductQrBuffer(productUrl: string): Promise<Buffer> {
    return qrcode.toBuffer(productUrl, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 300,
    });
  }

  private bufferToDataUrl(image: Buffer): string {
    return `data:image/png;base64,${image.toString('base64')}`;
  }

  private buildProductQrKey(
    product: Pick<Product, 'companyId' | 'id'>,
  ): string {
    return `qr-products-codes/company-${product.companyId}/product-${product.id}.png`;
  }

  private buildQrFileName(product: Product): string {
    const rawName =
      product.code?.trim() || product.name?.trim() || `product-${product.id}`;
    const slug = rawName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `${slug || `product-${product.id}`}-qr.png`;
  }

  private async ensureDiscountNameAvailable(
    name: string,
    companyId: number,
    excludeId?: number,
  ): Promise<void> {
    const qb = this.discountRepo
      .createQueryBuilder('discount')
      .where('discount.company_id = :companyId', { companyId })
      .andWhere('LOWER(TRIM(discount.name)) = LOWER(TRIM(:name))', {
        name,
      });

    if (excludeId) {
      qb.andWhere('discount.id <> :excludeId', { excludeId });
    }

    const existing = await qb.getOne();

    if (existing) {
      throw new ConflictException(`El descuento "${name}" ya existe`);
    }
  }

  private async resolveDiscountForProduct(
    discountId: number | null | undefined,
    companyId: number,
  ): Promise<Discount | null> {
    if (discountId === undefined || discountId === null) {
      return null;
    }

    const discount = await this.discountRepo.findOne({
      where: { id: discountId, companyId },
    });

    if (!discount) {
      throw new NotFoundException(
        `Descuento con id ${discountId} no encontrado`,
      );
    }

    if (!discount.isActive) {
      throw new BadRequestException(
        `El descuento "${discount.name}" no esta activo`,
      );
    }

    return discount;
  }

  private buildLegacyDiscountValue(
    discount: Discount | null,
    fallback?: string | null,
  ): string {
    if (discount) {
      return this.formatDiscountPercentage(discount.percentage);
    }

    return fallback?.trim() || 'No aplica';
  }

  private formatDiscountPercentage(value: number): string {
    const percentage = Number(value ?? 0);

    if (Number.isInteger(percentage)) {
      return `${percentage}%`;
    }

    return `${percentage.toFixed(2).replace(/\.?0+$/, '')}%`;
  }
}
