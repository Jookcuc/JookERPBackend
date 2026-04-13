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

    // 2. Agregar columna discount_id a product (si no existe)
    const productTable = await queryRunner.getTable('product');
    if (productTable) {
      const hasDiscountId = productTable.columns.some(
        (col) => col.name === 'discount_id',
      );

      if (!hasDiscountId) {
        await queryRunner.query(
          `ALTER TABLE "product" ADD COLUMN "discount_id" INTEGER NULL`,
        );

        await queryRunner.createForeignKey(
          'product',
          new TableForeignKey({
            columnNames: ['discount_id'],
            referencedTableName: 'discounts',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
            name: 'FK_product_discount_id',
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Eliminar FK y columna discount_id de product
    const productTable = await queryRunner.getTable('product');
    if (productTable) {
      const fk = productTable.foreignKeys.find(
        (fk) => fk.name === 'FK_product_discount_id',
      );
      if (fk) {
        await queryRunner.dropForeignKey('product', fk);
      }

      const hasDiscountId = productTable.columns.some(
        (col) => col.name === 'discount_id',
      );
      if (hasDiscountId) {
        await queryRunner.query(
          `ALTER TABLE "product" DROP COLUMN "discount_id"`,
        );
      }
    }

    // 2. Eliminar tabla discounts
    await queryRunner.dropTable('discounts', true);
  }
}
