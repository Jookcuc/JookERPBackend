import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProjectMaterialsTable1780945650950 implements MigrationInterface {
    name = 'AddProjectMaterialsTable1780945650950'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "project_materials" ("id" SERIAL NOT NULL, "project_id" integer NOT NULL, "task_id" integer, "product_id" integer NOT NULL, "estimated_quantity" numeric(10,2) NOT NULL, "estimated_unit_cost" numeric(10,2), "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4be35cdf6905d3effc565a82a64" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "marketing_leads" DROP COLUMN "whatsapp"`);
        await queryRunner.query(`ALTER TABLE "marketing_leads" DROP COLUMN "instagram"`);
        await queryRunner.query(`ALTER TABLE "marketing_leads" DROP COLUMN "facebook"`);
        await queryRunner.query(`ALTER TABLE "marketing_leads" DROP COLUMN "preferred_contact_channel"`);
        await queryRunner.query(`ALTER TABLE "project_expenses" ADD "invoice_id" integer`);
        await queryRunner.query(`ALTER TABLE "inventory_movement" ADD "project_id" integer`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD "project_id" integer`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "project_id" integer`);
        await queryRunner.query(`ALTER TABLE "project_expenses" ADD CONSTRAINT "FK_cd3004176954337444ac5821482" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_materials" ADD CONSTRAINT "FK_0db729e73208b74680d94529d50" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_materials" ADD CONSTRAINT "FK_72bc63e19697f63b40b45a072be" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_materials" ADD CONSTRAINT "FK_ec56495f5412eab470a2d96a906" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_movement" ADD CONSTRAINT "FK_901049bc3e0fad3f82fba530ccf" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD CONSTRAINT "FK_d89d99227ac6231810a21536996" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_9a04e1feb675f37ea6a344f809e" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_9a04e1feb675f37ea6a344f809e"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP CONSTRAINT "FK_d89d99227ac6231810a21536996"`);
        await queryRunner.query(`ALTER TABLE "inventory_movement" DROP CONSTRAINT "FK_901049bc3e0fad3f82fba530ccf"`);
        await queryRunner.query(`ALTER TABLE "project_materials" DROP CONSTRAINT "FK_ec56495f5412eab470a2d96a906"`);
        await queryRunner.query(`ALTER TABLE "project_materials" DROP CONSTRAINT "FK_72bc63e19697f63b40b45a072be"`);
        await queryRunner.query(`ALTER TABLE "project_materials" DROP CONSTRAINT "FK_0db729e73208b74680d94529d50"`);
        await queryRunner.query(`ALTER TABLE "project_expenses" DROP CONSTRAINT "FK_cd3004176954337444ac5821482"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "project_id"`);
        await queryRunner.query(`ALTER TABLE "invoice" DROP COLUMN "project_id"`);
        await queryRunner.query(`ALTER TABLE "inventory_movement" DROP COLUMN "project_id"`);
        await queryRunner.query(`ALTER TABLE "project_expenses" DROP COLUMN "invoice_id"`);
        await queryRunner.query(`ALTER TABLE "marketing_leads" ADD "preferred_contact_channel" character varying(40) NOT NULL DEFAULT 'none'`);
        await queryRunner.query(`ALTER TABLE "marketing_leads" ADD "facebook" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "marketing_leads" ADD "instagram" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "marketing_leads" ADD "whatsapp" character varying(40)`);
        await queryRunner.query(`DROP TABLE "project_materials"`);
    }

}
