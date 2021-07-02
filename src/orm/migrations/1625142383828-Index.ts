import {MigrationInterface, QueryRunner} from "typeorm";

export class Index1625142383828 implements MigrationInterface {
    name = 'Index1625142383828'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_contract_address_type_gov"`);
        await queryRunner.query(`DROP INDEX "idx_tx_address_datetime_gov"`);
        await queryRunner.query(`DROP INDEX "idx_price_datetime_asset"`);
        await queryRunner.query(`DROP INDEX "idx_oracle_price_datetime_asset"`);
        await queryRunner.query(`CREATE INDEX "IDX_59d5a7aca69d7ea58c101a44c6" ON "contract" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_67d6081ebdb7f4c1cc9ad6d703" ON "tx" ("address") `);
        await queryRunner.query(`CREATE INDEX "IDX_d7e38ca41a58ea8032b0917be2" ON "tx" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_0258cf60395287c4d3675ca8c6" ON "tx" ("datetime") `);
        await queryRunner.query(`CREATE INDEX "IDX_a5a0f4339e9bb9f892991a590c" ON "price" ("datetime") `);
        await queryRunner.query(`CREATE INDEX "IDX_c6b7411672e54ed5ac374a968f" ON "oracle_price" ("datetime") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_c6b7411672e54ed5ac374a968f"`);
        await queryRunner.query(`DROP INDEX "IDX_a5a0f4339e9bb9f892991a590c"`);
        await queryRunner.query(`DROP INDEX "IDX_0258cf60395287c4d3675ca8c6"`);
        await queryRunner.query(`DROP INDEX "IDX_d7e38ca41a58ea8032b0917be2"`);
        await queryRunner.query(`DROP INDEX "IDX_67d6081ebdb7f4c1cc9ad6d703"`);
        await queryRunner.query(`DROP INDEX "IDX_59d5a7aca69d7ea58c101a44c6"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_oracle_price_datetime_asset" ON "oracle_price" ("token", "datetime") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_price_datetime_asset" ON "price" ("token", "datetime") `);
        await queryRunner.query(`CREATE INDEX "idx_tx_address_datetime_gov" ON "tx" ("gov_id", "address", "datetime") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_contract_address_type_gov" ON "contract" ("gov_id", "address", "type") `);
    }

}
