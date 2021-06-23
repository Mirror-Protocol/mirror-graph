import {MigrationInterface, QueryRunner} from "typeorm";

export class AddShortReward1624442979125 implements MigrationInterface {
    name = 'AddShortReward1624442979125'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_contract_address_type_gov"`);
        await queryRunner.query(`ALTER TYPE "contract_type_enum" RENAME TO "contract_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "contract_type_enum" AS ENUM('collector', 'factory', 'gov', 'limitOrder', 'mint', 'oracle', 'staking', 'token', 'lpToken', 'tokenFactory', 'pair', 'community', 'airdrop', 'collateralOracle', 'lock', 'shortReward')`);
        await queryRunner.query(`ALTER TABLE "contract" ALTER COLUMN "type" TYPE "contract_type_enum" USING "type"::"text"::"contract_type_enum"`);
        await queryRunner.query(`DROP TYPE "contract_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "tx" DROP COLUMN "tags"`);
        await queryRunner.query(`ALTER TABLE "tx" ADD "tags" text NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_contract_address_type_gov" ON "contract" ("address", "type", "gov_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_contract_address_type_gov"`);
        await queryRunner.query(`ALTER TABLE "tx" DROP COLUMN "tags"`);
        await queryRunner.query(`ALTER TABLE "tx" ADD "tags" text array NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`CREATE TYPE "contract_type_enum_old" AS ENUM('collector', 'factory', 'gov', 'limitOrder', 'mint', 'oracle', 'staking', 'token', 'lpToken', 'tokenFactory', 'pair', 'community', 'airdrop', 'collateralOracle', 'lock')`);
        await queryRunner.query(`ALTER TABLE "contract" ALTER COLUMN "type" TYPE "contract_type_enum_old" USING "type"::"text"::"contract_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "contract_type_enum"`);
        await queryRunner.query(`ALTER TYPE "contract_type_enum_old" RENAME TO "contract_type_enum"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_contract_address_type_gov" ON "contract" ("gov_id", "address", "type") `);
    }

}
