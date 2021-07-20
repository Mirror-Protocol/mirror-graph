import {MigrationInterface, QueryRunner} from "typeorm";

export class AccountGovStaked1626762308515 implements MigrationInterface {
    name = 'AccountGovStaked1626762308515'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account" ADD "gov_staked" numeric(40)`);
        await queryRunner.query(`ALTER TABLE "account" ADD "withdrawn_gov_rewards" numeric(40)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "withdrawn_gov_rewards"`);
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "gov_staked"`);
    }
}
