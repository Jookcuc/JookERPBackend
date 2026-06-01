import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMarketingLeadsTable1779380000000 implements MigrationInterface {
  name = 'CreateMarketingLeadsTable1779380000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "marketing_leads" (
        "id" SERIAL NOT NULL,
        "company_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "business_name" character varying(180) NOT NULL,
        "contact_name" character varying(180),
        "email" character varying(255),
        "phone" character varying(40),
        "city" character varying(120) NOT NULL DEFAULT 'Cucuta',
        "category" character varying(120),
        "website" character varying(255),
        "address" character varying(255),
        "source" character varying(120),
        "source_url" character varying(500),
        "status" character varying(40) NOT NULL DEFAULT 'new',
        "consent_status" character varying(40) NOT NULL DEFAULT 'unknown',
        "last_contacted_at" TIMESTAMP,
        "contact_attempts" integer NOT NULL DEFAULT 0,
        "opt_out_token" character varying(80),
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_marketing_leads_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_marketing_leads_company_status" ON "marketing_leads" ("company_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_marketing_leads_company_city" ON "marketing_leads" ("company_id", "city")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_marketing_leads_company_email_unique" ON "marketing_leads" ("company_id", LOWER("email")) WHERE "email" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_marketing_leads_company_phone_unique" ON "marketing_leads" ("company_id", "phone") WHERE "phone" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_marketing_leads_opt_out_token_unique" ON "marketing_leads" ("opt_out_token") WHERE "opt_out_token" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_marketing_leads_opt_out_token_unique"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_marketing_leads_company_phone_unique"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_marketing_leads_company_email_unique"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_marketing_leads_company_city"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_marketing_leads_company_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "marketing_leads"`);
  }
}
