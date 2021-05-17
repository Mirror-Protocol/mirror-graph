import {MigrationInterface, QueryRunner} from "typeorm";

export class CdpEntity1620973474572 implements MigrationInterface {
    name = 'CdpEntity1620973474572'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cdp" ADD "is_short" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cdp" DROP COLUMN "is_short"`);
    }

}
