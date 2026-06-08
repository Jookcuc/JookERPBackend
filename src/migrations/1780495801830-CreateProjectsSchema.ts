import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProjectsSchema1780495801830 implements MigrationInterface {
    name = 'CreateProjectsSchema1780495801830'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "project_milestones" ("id" SERIAL NOT NULL, "project_id" integer NOT NULL, "phase_id" integer, "name" character varying(255) NOT NULL, "date" date, "is_completed" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0c561300a12c6ba3ad793dff4b8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "project_members" ("id" SERIAL NOT NULL, "project_id" integer NOT NULL, "employee_id" integer NOT NULL, "role" character varying(100), "assigned_hours" numeric(8,2) NOT NULL DEFAULT '0', "hourly_rate" numeric(10,2), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0b2f46f804be4aea9234c78bcc9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "project_expenses" ("id" SERIAL NOT NULL, "project_id" integer NOT NULL, "task_id" integer, "expenseDate" date NOT NULL, "amount" numeric(15,2) NOT NULL, "concept" character varying(255) NOT NULL, "description" text, "invoice_number" character varying(100), "status" character varying(20) NOT NULL DEFAULT 'PENDIENTE', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_41b23d7465101a8d9aa14f78151" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "project_updates" ("id" SERIAL NOT NULL, "project_id" integer NOT NULL, "author_id" integer NOT NULL, "type" character varying(20) NOT NULL DEFAULT 'AVANCE', "description" text NOT NULL, "date" date NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2093d4d18851bc0f6ec8b1197e7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "material_consumptions" ("id" SERIAL NOT NULL, "project_id" integer, "task_id" integer, "product_id" integer NOT NULL, "date" date NOT NULL, "quantity_used" numeric(10,2) NOT NULL, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8a6a77d1206f3c14965feb1c9bb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "projects" ("id" SERIAL NOT NULL, "company_id" integer NOT NULL, "contact_id" integer, "manager_id" integer, "name" character varying(255) NOT NULL, "description" text, "objectives" text, "status" character varying(30) NOT NULL DEFAULT 'PLANIFICACION', "budget" numeric(15,2) NOT NULL DEFAULT '0', "start_date" date, "end_date" date, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "project_phases" ("id" SERIAL NOT NULL, "project_id" integer NOT NULL, "name" character varying(255) NOT NULL, "description" text, "status" character varying(30) NOT NULL DEFAULT 'PENDIENTE', "start_date" date, "end_date" date, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_751991724b3ba4af6b5f1ecbea0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "project_tasks" ("id" SERIAL NOT NULL, "phase_id" integer NOT NULL, "title" character varying(255) NOT NULL, "description" text, "estimated_hours" numeric(8,2) NOT NULL DEFAULT '0', "progress_percentage" numeric(5,2) NOT NULL DEFAULT '0', "priority" character varying(20) NOT NULL DEFAULT 'MEDIA', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b1b6204912a6f44133df3a4518b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "time_logs" ("id" SERIAL NOT NULL, "project_id" integer, "task_id" integer, "employee_id" integer NOT NULL, "date" date NOT NULL, "hours_spent" numeric(5,2) NOT NULL, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8657e6aaa7035da9fc7309f385a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "project_task_dependencies" ("task_id" integer NOT NULL, "depends_on_task_id" integer NOT NULL, CONSTRAINT "PK_2286628b7b0b5a3ecb891569882" PRIMARY KEY ("task_id", "depends_on_task_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_10bc3fd14f4ba3065ae13b7ef1" ON "project_task_dependencies" ("task_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_78f31723ba483648cd5268fb51" ON "project_task_dependencies" ("depends_on_task_id") `);
        await queryRunner.query(`ALTER TABLE "project_milestones" ADD CONSTRAINT "FK_4072d2ff8e9ee23e9e03e5f6721" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_milestones" ADD CONSTRAINT "FK_bf539ba4d973f7ee09615c343e8" FOREIGN KEY ("phase_id") REFERENCES "project_phases"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_members" ADD CONSTRAINT "FK_b5729113570c20c7e214cf3f58d" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_members" ADD CONSTRAINT "FK_983edb29503f23c905f843c0322" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_expenses" ADD CONSTRAINT "FK_bdef37825fbfe8dcb372a813699" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_expenses" ADD CONSTRAINT "FK_25a464861134da327b0d093ce3c" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_updates" ADD CONSTRAINT "FK_80cfd62a1d7c871fa100645f427" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_updates" ADD CONSTRAINT "FK_a67b662f80dc9060355188ba95a" FOREIGN KEY ("author_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "material_consumptions" ADD CONSTRAINT "FK_f400082152cb8b3f9adc63d1ed1" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "material_consumptions" ADD CONSTRAINT "FK_0c730af83c43bb4ddd289ad7d27" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "material_consumptions" ADD CONSTRAINT "FK_7dfb4526d0c74a041b32fd1f015" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_c8708288b8e6a060ed7b9e1a226" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_f0476489140ab3ad72d8ecf8736" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_87bd52575ded2be008b89dd7b21" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_phases" ADD CONSTRAINT "FK_e5b4414fb3d4c04cf6012705987" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_tasks" ADD CONSTRAINT "FK_03e790a96cd2ae8955fc2906ed0" FOREIGN KEY ("phase_id") REFERENCES "project_phases"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_logs" ADD CONSTRAINT "FK_af979061693ad952fde8e38c883" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_logs" ADD CONSTRAINT "FK_5863acae12451e29b1414a3795c" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_logs" ADD CONSTRAINT "FK_db48a3e3210340e77b10c1a6ab3" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_task_dependencies" ADD CONSTRAINT "FK_10bc3fd14f4ba3065ae13b7ef13" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "project_task_dependencies" ADD CONSTRAINT "FK_78f31723ba483648cd5268fb512" FOREIGN KEY ("depends_on_task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project_task_dependencies" DROP CONSTRAINT "FK_78f31723ba483648cd5268fb512"`);
        await queryRunner.query(`ALTER TABLE "project_task_dependencies" DROP CONSTRAINT "FK_10bc3fd14f4ba3065ae13b7ef13"`);
        await queryRunner.query(`ALTER TABLE "time_logs" DROP CONSTRAINT "FK_db48a3e3210340e77b10c1a6ab3"`);
        await queryRunner.query(`ALTER TABLE "time_logs" DROP CONSTRAINT "FK_5863acae12451e29b1414a3795c"`);
        await queryRunner.query(`ALTER TABLE "time_logs" DROP CONSTRAINT "FK_af979061693ad952fde8e38c883"`);
        await queryRunner.query(`ALTER TABLE "project_tasks" DROP CONSTRAINT "FK_03e790a96cd2ae8955fc2906ed0"`);
        await queryRunner.query(`ALTER TABLE "project_phases" DROP CONSTRAINT "FK_e5b4414fb3d4c04cf6012705987"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_87bd52575ded2be008b89dd7b21"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_f0476489140ab3ad72d8ecf8736"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_c8708288b8e6a060ed7b9e1a226"`);
        await queryRunner.query(`ALTER TABLE "material_consumptions" DROP CONSTRAINT "FK_7dfb4526d0c74a041b32fd1f015"`);
        await queryRunner.query(`ALTER TABLE "material_consumptions" DROP CONSTRAINT "FK_0c730af83c43bb4ddd289ad7d27"`);
        await queryRunner.query(`ALTER TABLE "material_consumptions" DROP CONSTRAINT "FK_f400082152cb8b3f9adc63d1ed1"`);
        await queryRunner.query(`ALTER TABLE "project_updates" DROP CONSTRAINT "FK_a67b662f80dc9060355188ba95a"`);
        await queryRunner.query(`ALTER TABLE "project_updates" DROP CONSTRAINT "FK_80cfd62a1d7c871fa100645f427"`);
        await queryRunner.query(`ALTER TABLE "project_expenses" DROP CONSTRAINT "FK_25a464861134da327b0d093ce3c"`);
        await queryRunner.query(`ALTER TABLE "project_expenses" DROP CONSTRAINT "FK_bdef37825fbfe8dcb372a813699"`);
        await queryRunner.query(`ALTER TABLE "project_members" DROP CONSTRAINT "FK_983edb29503f23c905f843c0322"`);
        await queryRunner.query(`ALTER TABLE "project_members" DROP CONSTRAINT "FK_b5729113570c20c7e214cf3f58d"`);
        await queryRunner.query(`ALTER TABLE "project_milestones" DROP CONSTRAINT "FK_bf539ba4d973f7ee09615c343e8"`);
        await queryRunner.query(`ALTER TABLE "project_milestones" DROP CONSTRAINT "FK_4072d2ff8e9ee23e9e03e5f6721"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_78f31723ba483648cd5268fb51"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_10bc3fd14f4ba3065ae13b7ef1"`);
        await queryRunner.query(`DROP TABLE "project_task_dependencies"`);
        await queryRunner.query(`DROP TABLE "time_logs"`);
        await queryRunner.query(`DROP TABLE "project_tasks"`);
        await queryRunner.query(`DROP TABLE "project_phases"`);
        await queryRunner.query(`DROP TABLE "projects"`);
        await queryRunner.query(`DROP TABLE "material_consumptions"`);
        await queryRunner.query(`DROP TABLE "project_updates"`);
        await queryRunner.query(`DROP TABLE "project_expenses"`);
        await queryRunner.query(`DROP TABLE "project_members"`);
        await queryRunner.query(`DROP TABLE "project_milestones"`);
    }

}
