import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateDiscountsTable1744490801000 implements MigrationInterface {
  name = 'CreateDiscountsTable1744490801000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear tabla discounts
    await queryRunner.createTable(
      new Table({
        name: 'discounts',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'company_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '120',
            isNullable: false,
          },
          {
            name: 'percentage',
            type: 'numeric',
            precision: 5,
            scale: 2,
            default: '0',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true /* ifNotExists */,
    );

    // 2. Agregar columna discount_id a products (si no existe)
    const productsTable = await queryRunner.getTable('products');
    if (productsTable) {
      const hasDiscountId = productsTable.columns.some(
        (col) => col.name === 'discount_id',
      );

      if (!hasDiscountId) {
        await queryRunner.query(
          `ALTER TABLE "products" ADD COLUMN "discount_id" INTEGER NULL`,
        );

        await queryRunner.createForeignKey(
          'products',
          new TableForeignKey({
            columnNames: ['discount_id'],
            referencedTableName: 'discounts',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
            name: 'FK_products_discount_id',
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Eliminar FK y columna discount_id de products
    const productsTable = await queryRunner.getTable('products');
    if (productsTable) {
      const fk = productsTable.foreignKeys.find(
        (fk) => fk.name === 'FK_products_discount_id',
      );
      if (fk) {
        await queryRunner.dropForeignKey('products', fk);
      }

      const hasDiscountId = productsTable.columns.some(
        (col) => col.name === 'discount_id',
      );
      if (hasDiscountId) {
        await queryRunner.query(
          `ALTER TABLE "products" DROP COLUMN "discount_id"`,
        );
      }
    }

    // 2. Eliminar tabla discounts
    await queryRunner.dropTable('discounts', true);
  }
}
