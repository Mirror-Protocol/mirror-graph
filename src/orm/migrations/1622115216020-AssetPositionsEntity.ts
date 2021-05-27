import {MigrationInterface, QueryRunner} from "typeorm";

export class AssetPositionsEntity1622115216020 implements MigrationInterface {
    name = 'AssetPositionsEntity1622115216020'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset_positions" DROP COLUMN "as_collateral"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset_positions" ADD "as_collateral" numeric(40,0) NOT NULL DEFAULT '0'`);
    }

}
