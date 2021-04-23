import {MigrationInterface, QueryRunner} from "typeorm";

export class AddBscToNetworkEnum1619161768053 implements MigrationInterface {
    name = 'AddBscToNetworkEnum1619161768053'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "asset_statistic_daily_network_enum" RENAME TO "asset_statistic_daily_network_enum_old"`);
        await queryRunner.query(`CREATE TYPE "asset_statistic_daily_network_enum" AS ENUM('TERRA', 'ETH', 'BSC', 'COMBINE')`);
        await queryRunner.query(`ALTER TABLE "asset_statistic_daily" ALTER COLUMN "network" TYPE "asset_statistic_daily_network_enum" USING "network"::"text"::"asset_statistic_daily_network_enum"`);
        await queryRunner.query(`DROP TYPE "asset_statistic_daily_network_enum_old"`);
        await queryRunner.query(`ALTER TYPE "asset_statistic_hourly_network_enum" RENAME TO "asset_statistic_hourly_network_enum_old"`);
        await queryRunner.query(`CREATE TYPE "asset_statistic_hourly_network_enum" AS ENUM('TERRA', 'ETH', 'BSC', 'COMBINE')`);
        await queryRunner.query(`ALTER TABLE "asset_statistic_hourly" ALTER COLUMN "network" TYPE "asset_statistic_hourly_network_enum" USING "network"::"text"::"asset_statistic_hourly_network_enum"`);
        await queryRunner.query(`DROP TYPE "asset_statistic_hourly_network_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "asset_statistic_hourly_network_enum_old" AS ENUM('TERRA', 'ETH', 'COMBINE')`);
        await queryRunner.query(`ALTER TABLE "asset_statistic_hourly" ALTER COLUMN "network" TYPE "asset_statistic_hourly_network_enum_old" USING "network"::"text"::"asset_statistic_hourly_network_enum_old"`);
        await queryRunner.query(`DROP TYPE "asset_statistic_hourly_network_enum"`);
        await queryRunner.query(`ALTER TYPE "asset_statistic_hourly_network_enum_old" RENAME TO "asset_statistic_hourly_network_enum"`);
        await queryRunner.query(`CREATE TYPE "asset_statistic_daily_network_enum_old" AS ENUM('TERRA', 'ETH', 'COMBINE')`);
        await queryRunner.query(`ALTER TABLE "asset_statistic_daily" ALTER COLUMN "network" TYPE "asset_statistic_daily_network_enum_old" USING "network"::"text"::"asset_statistic_daily_network_enum_old"`);
        await queryRunner.query(`DROP TYPE "asset_statistic_daily_network_enum"`);
        await queryRunner.query(`ALTER TYPE "asset_statistic_daily_network_enum_old" RENAME TO "asset_statistic_daily_network_enum"`);
    }

}
