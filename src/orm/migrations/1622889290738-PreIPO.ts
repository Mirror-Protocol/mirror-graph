import {MigrationInterface, QueryRunner} from "typeorm";

export class PreIPO1622889290738 implements MigrationInterface {
    name = 'PreIPO1622889290738'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "asset_status_enum" RENAME TO "asset_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "asset_status_enum" AS ENUM('NONE', 'LISTED', 'DELISTED', 'COLLATERAL', 'PRE_IPO')`);
        await queryRunner.query(`ALTER TABLE "asset" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "asset" ALTER COLUMN "status" TYPE "asset_status_enum" USING "status"::"text"::"asset_status_enum"`);
        await queryRunner.query(`ALTER TABLE "asset" ALTER COLUMN "status" SET DEFAULT 'NONE'`);
        await queryRunner.query(`DROP TYPE "asset_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "asset_positions" ADD CONSTRAINT "FK_07222f75a8c1127264c6ad98f36" FOREIGN KEY ("token") REFERENCES "asset"("token") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset_positions" DROP CONSTRAINT "FK_07222f75a8c1127264c6ad98f36"`);
        await queryRunner.query(`CREATE TYPE "asset_status_enum_old" AS ENUM('NONE', 'LISTED', 'DELISTED', 'COLLATERAL')`);
        await queryRunner.query(`ALTER TABLE "asset" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "asset" ALTER COLUMN "status" TYPE "asset_status_enum_old" USING "status"::"text"::"asset_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "asset" ALTER COLUMN "status" SET DEFAULT 'NONE'`);
        await queryRunner.query(`DROP TYPE "asset_status_enum"`);
        await queryRunner.query(`ALTER TYPE "asset_status_enum_old" RENAME TO "asset_status_enum"`);
    }

}
