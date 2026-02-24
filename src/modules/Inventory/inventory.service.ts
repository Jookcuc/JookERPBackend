import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { ProductType } from './entities/product-type.entity';
import { Product } from './entities/product.entity';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { FilterProductTypeDto } from './dto/filter-product-type.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(ProductType)
    private readonly typeRepo: Repository<ProductType>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // ─── TIPOS ───────────────────────────────────────────────────

  async createType(dto: CreateProductTypeDto, user: any): Promise<ProductType> {
    const existing = await this.typeRepo.findOne({
      where: { code: dto.code, companyId: user.companyId },
    });
    if (existing) throw new ConflictException(`El código ${dto.code} ya existe`);

    const type = this.typeRepo.create({ ...dto, userId: user.id, companyId: user.companyId });
    return this.typeRepo.save(type);
  }

  async findAllTypes(filters: FilterProductTypeDto, user: any) {
    const { name, code, startDate, endDate } = filters;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 5;
    const skip = (page - 1) * limit;

    const where: any = { companyId: user.companyId };  // ← siempre filtra por empresa

    if (user.role === 2) where.userId = user.id;  // rol 'user' solo ve los suyos
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

    const mapped = data.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      createdAt: t.createdAt,
      totalStock: t.products?.reduce((acc, p) => acc + p.stock, 0) ?? 0,
    }));

    return { data: mapped, total, page, limit, totalPages: Math.ceil(total / limit) };
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

  async updateType(id: number, dto: UpdateProductTypeDto, user: any): Promise<ProductType> {
    const type = await this.typeRepo.findOne({ where: { id, companyId: user.companyId } });
    if (!type) throw new NotFoundException(`Tipo con id ${id} no encontrado`);

    if (dto.code && dto.code !== type.code) {
      const codeExists = await this.typeRepo.findOne({
        where: { code: dto.code, companyId: user.companyId },
      });
      if (codeExists) throw new ConflictException(`El código ${dto.code} ya está en uso`);
    }

    Object.assign(type, dto);
    return this.typeRepo.save(type);
  }

  async removeType(id: number, user: any): Promise<{ message: string }> {
    const type = await this.typeRepo.findOne({
      where: { id, companyId: user.companyId },
      relations: ['products'],
    });
    if (!type) throw new NotFoundException(`Tipo con id ${id} no encontrado`);

    if (type.products?.length > 0) {
      throw new ConflictException(
        `No se puede eliminar el tipo porque tiene ${type.products.length} producto(s) asociado(s)`
      );
    }

    await this.typeRepo.remove(type);
    return { message: `Tipo "${type.name}" eliminado correctamente` };
  }

  // ─── PRODUCTOS ───────────────────────────────────────────────

  async createProduct(dto: CreateProductDto, user: any): Promise<Product> {
    const typeExists = await this.typeRepo.findOne({
      where: { id: dto.typeId, companyId: user.companyId },
    });
    if (!typeExists) throw new NotFoundException(`Tipo con id ${dto.typeId} no encontrado`);

    const existing = await this.productRepo.findOne({
      where: { code: dto.code, companyId: user.companyId },
    });
    if (existing) throw new ConflictException(`El código de producto ${dto.code} ya existe`);

    const product = this.productRepo.create({ ...dto, userId: user.id, companyId: user.companyId });
    return this.productRepo.save(product);
  }

  async findAllProducts(filters: FilterProductDto, user: any) {
    const { name, code, minPrice, maxPrice, typeId, startDate, endDate } = filters;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 5;
    const skip = (page - 1) * limit;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.type', 'type')
      .skip(skip)
      .take(limit)
      .orderBy('p.createdAt', 'DESC')
      .andWhere('p.company_id = :companyId', { companyId: user.companyId });  // ← siempre

    if (user.role === 2) qb.andWhere('p.user_id = :userId', { userId: user.id });  // solo los suyos
    if (name) qb.andWhere('p.name ILIKE :name', { name: `%${name}%` });
    if (code) qb.andWhere('p.code ILIKE :code', { code: `%${code}%` });
    if (typeId) qb.andWhere('p.type_id = :typeId', { typeId });
    if (minPrice !== undefined) qb.andWhere('p.sale_price >= :minPrice', { minPrice });
    if (maxPrice !== undefined) qb.andWhere('p.sale_price <= :maxPrice', { maxPrice });
    if (startDate) qb.andWhere('p.entry_date >= :startDate', { startDate });
    if (endDate) qb.andWhere('p.entry_date <= :endDate', { endDate });

    const [data, total] = await qb.getManyAndCount();
    const kpis = await this.getKpis(user);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit), kpis };
  }

  async findOneProduct(id: number, user: any): Promise<Product> {
    const where: any = { id, companyId: user.companyId };
    if (user.role === 2) where.userId = user.id;

    const product = await this.productRepo.findOne({
      where,
      relations: ['type'],
    });
    if (!product) throw new NotFoundException(`Producto con id ${id} no encontrado`);
    return product;
  }

  async updateProduct(id: number, dto: UpdateProductDto, user: any): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id, companyId: user.companyId },
    });
    if (!product) throw new NotFoundException(`Producto con id ${id} no encontrado`);

    if (dto.typeId) {
      const typeExists = await this.typeRepo.findOne({
        where: { id: dto.typeId, companyId: user.companyId },
      });
      if (!typeExists) throw new NotFoundException(`Tipo con id ${dto.typeId} no encontrado`);
    }

    if (dto.code && dto.code !== product.code) {
      const codeExists = await this.productRepo.findOne({
        where: { code: dto.code, companyId: user.companyId },
      });
      if (codeExists) throw new ConflictException(`El código ${dto.code} ya está en uso`);
    }

    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async removeProduct(id: number, user: any): Promise<{ message: string }> {
    const product = await this.productRepo.findOne({
      where: { id, companyId: user.companyId },
    });
    if (!product) throw new NotFoundException(`Producto con id ${id} no encontrado`);

    await this.productRepo.remove(product);
    return { message: `Producto "${product.name}" eliminado correctamente` };
  }

  private async getKpis(user: any) {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .andWhere('p.company_id = :companyId', { companyId: user.companyId });

    if (user.role === 2) qb.andWhere('p.user_id = :userId', { userId: user.id });

    const allProducts = await qb.getMany();

    return {
      totalProducts: allProducts.length,
      totalCost: +allProducts.reduce((acc, p) => acc + Number(p.cost) * p.stock, 0).toFixed(2),
      totalRetailValue: +allProducts.reduce((acc, p) => acc + Number(p.salePrice) * p.stock, 0).toFixed(2),
      outOfStock: allProducts.filter((p) => p.stock === 0).length,
      lowStock: allProducts.filter((p) => p.stock > 0 && p.stock <= p.minStock).length,
    };
  }
}