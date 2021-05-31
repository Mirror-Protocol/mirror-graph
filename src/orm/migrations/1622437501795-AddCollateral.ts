import {MigrationInterface, QueryRunner} from "typeorm";

export class AddCollateral1622437501795 implements MigrationInterface {
    name = 'AddCollateral1622437501795'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oracle_price" DROP COLUMN "price_multiplier"`);
        await queryRunner.query(`ALTER TYPE "asset_status_enum" RENAME TO "asset_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "asset_status_enum" AS ENUM('NONE', 'LISTED', 'DELISTED', 'COLLATERAL')`);
        await queryRunner.query(`ALTER TABLE "asset" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "asset" ALTER COLUMN "status" TYPE "asset_status_enum" USING "status"::"text"::"asset_status_enum"`);
        await queryRunner.query(`ALTER TABLE "asset" ALTER COLUMN "status" SET DEFAULT 'NONE'`);
        await queryRunner.query(`DROP TYPE "asset_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "asset_status_enum_old" AS ENUM('NONE', 'LISTED', 'DELISTED')`);
        await queryRunner.query(`ALTER TABLE "asset" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "asset" ALTER COLUMN "status" TYPE "asset_status_enum_old" USING "status"::"text"::"asset_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "asset" ALTER COLUMN "status" SET DEFAULT 'NONE'`);
        await queryRunner.query(`DROP TYPE "asset_status_enum"`);
        await queryRunner.query(`ALTER TYPE "asset_status_enum_old" RENAME TO "asset_status_enum"`);
        await queryRunner.query(`ALTER TABLE "oracle_price" ADD "price_multiplier" numeric(40,6) NOT NULL DEFAULT '1'`);
    }

}
