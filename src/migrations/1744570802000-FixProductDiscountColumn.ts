import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class FixProductDiscountColumn1744570802000
  implements MigrationInterface {
  name = 'FixProductDiscountColumn1744570802000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const productTable = await queryRunner.getTable('product');

    if (!productTable) {
      return;
    }

    const hasDiscountId = productTable.columns.some(
      (column) => column.name === 'discount_id',
    );

    if (!hasDiscountId) {
      await queryRunner.query(
        `ALTER TABLE "product" ADD COLUMN "discount_id" INTEGER NULL`,
      );
    }

    const refreshedTable = await queryRunner.getTable('product');
    const hasDiscountFk = refreshedTable?.foreignKeys.some(
      (foreignKey) => foreignKey.name === 'FK_product_discount_id',
    );

    if (!hasDiscountFk) {
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

  public async down(): Promise<void> {
    // Reparacion de esquema. Se deja sin rollback automatico
    // para no eliminar una columna ya requerida por la entidad Product.
  }
}
