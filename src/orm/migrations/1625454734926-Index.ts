import {MigrationInterface, QueryRunner} from "typeorm";

export class Index1625454734926 implements MigrationInterface {
    name = 'Index1625454734926'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_airdrop_stage_address"`);
        await queryRunner.query(`DROP INDEX "idx_block_chainid_height"`);
        await queryRunner.query(`CREATE INDEX "IDX_29d2de588e9ffb7509b88febee" ON "airdrop" ("stage") `);
        await queryRunner.query(`CREATE INDEX "IDX_578996f0edd324f87de54f8ef4" ON "airdrop" ("address") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_578996f0edd324f87de54f8ef4"`);
        await queryRunner.query(`DROP INDEX "IDX_29d2de588e9ffb7509b88febee"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_block_chainid_height" ON "block" ("chain_id", "height") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_airdrop_stage_address" ON "airdrop" ("stage", "address") `);
    }

}
