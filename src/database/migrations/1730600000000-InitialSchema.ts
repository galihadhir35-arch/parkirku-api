import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1730600000000 implements MigrationInterface {
  name = 'InitialSchema1730600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "vehicle_type" AS ENUM ('CAR', 'MOTORCYCLE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "slot_status" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "ticket_status" AS ENUM ('ACTIVE', 'COMPLETED')`,
    );

    await queryRunner.query(`
      CREATE TABLE "vehicles" (
        "id" SERIAL NOT NULL,
        "plate_number" character varying(12) NOT NULL,
        "type" "vehicle_type" NOT NULL,
        "owner_name" character varying(100) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "pk_vehicles" PRIMARY KEY ("id"),
        CONSTRAINT "uq_vehicles_plate_number" UNIQUE ("plate_number"),
        CONSTRAINT "chk_vehicles_plate_number_length"
          CHECK (char_length("plate_number") BETWEEN 1 AND 12),
        CONSTRAINT "chk_vehicles_owner_name_length"
          CHECK (char_length("owner_name") BETWEEN 2 AND 100)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "slots" (
        "id" SERIAL NOT NULL,
        "code" character varying(20) NOT NULL,
        "floor" integer NOT NULL,
        "type" "vehicle_type" NOT NULL,
        "status" "slot_status" NOT NULL DEFAULT 'AVAILABLE',
        CONSTRAINT "pk_slots" PRIMARY KEY ("id"),
        CONSTRAINT "uq_slots_code" UNIQUE ("code"),
        CONSTRAINT "chk_slots_code_length"
          CHECK (char_length("code") BETWEEN 1 AND 20),
        CONSTRAINT "chk_slots_floor" CHECK ("floor" >= 1)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tickets" (
        "id" SERIAL NOT NULL,
        "vehicle_id" integer NOT NULL,
        "slot_id" integer NOT NULL,
        "entry_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "exit_time" TIMESTAMP WITH TIME ZONE,
        "fee" integer,
        "status" "ticket_status" NOT NULL DEFAULT 'ACTIVE',
        CONSTRAINT "pk_tickets" PRIMARY KEY ("id"),
        CONSTRAINT "fk_tickets_vehicle"
          FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_tickets_slot"
          FOREIGN KEY ("slot_id") REFERENCES "slots"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "chk_tickets_fee" CHECK ("fee" IS NULL OR "fee" >= 0),
        CONSTRAINT "chk_tickets_completion"
          CHECK (
            ("status" = 'ACTIVE' AND "exit_time" IS NULL AND "fee" IS NULL)
            OR
            ("status" = 'COMPLETED' AND "exit_time" IS NOT NULL AND "fee" IS NOT NULL)
          )
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_tickets_active_vehicle"
      ON "tickets" ("vehicle_id")
      WHERE "status" = 'ACTIVE'
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_tickets_active_slot"
      ON "tickets" ("slot_id")
      WHERE "status" = 'ACTIVE'
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tickets_entry_time_id"
      ON "tickets" ("entry_time" DESC, "id" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_tickets_entry_time_id"`);
    await queryRunner.query(`DROP INDEX "uq_tickets_active_slot"`);
    await queryRunner.query(`DROP INDEX "uq_tickets_active_vehicle"`);
    await queryRunner.query(`DROP TABLE "tickets"`);
    await queryRunner.query(`DROP TABLE "slots"`);
    await queryRunner.query(`DROP TABLE "vehicles"`);
    await queryRunner.query(`DROP TYPE "ticket_status"`);
    await queryRunner.query(`DROP TYPE "slot_status"`);
    await queryRunner.query(`DROP TYPE "vehicle_type"`);
  }
}
