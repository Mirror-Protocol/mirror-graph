import {MigrationInterface, QueryRunner} from "typeorm";

export class CdpEntity1623922177095 implements MigrationInterface {
    name = 'CdpEntity1623922177095'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cdp" ADD "mint_value" numeric(40) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "cdp" ADD "collateral_value" numeric(40) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "cdp" ADD "min_collateral_ratio" numeric(40,6) NOT NULL DEFAULT '2'`);
        await queryRunner.query(`CREATE INDEX "IDX_3594abc1463386d49b4bab74da" ON "cdp" ("collateral_ratio") `);
        await queryRunner.query(`CREATE INDEX "IDX_c49397d5f687b8b04aa9aa5d35" ON "cdp" ("min_collateral_ratio") `);
        const result = await queryRunner.query(`SELECT token FROM asset WHERE symbol='MIR'`)
        const mirrorToken = result[0].token
        await queryRunner.query(`
  UPDATE cdp
    SET
	  mint_value = ((SELECT close FROM oracle_price WHERE token = cdp.token ORDER BY id DESC LIMIT 1) * mint_amount),
	  collateral_value = CASE
        WHEN collateral_token = 'uusd' THEN collateral_amount
        WHEN collateral_token = '${mirrorToken}' THEN ((SELECT close FROM price WHERE token = '${mirrorToken}' ORDER BY id DESC LIMIT 1) * collateral_amount)
        ELSE ((SELECT close FROM oracle_price WHERE token = cdp.collateral_token ORDER BY id DESC LIMIT 1) * collateral_amount)
	  END
    WHERE collateral_amount > 0 AND mint_amount > 0;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_c49397d5f687b8b04aa9aa5d35"`);
        await queryRunner.query(`DROP INDEX "IDX_3594abc1463386d49b4bab74da"`);
        await queryRunner.query(`ALTER TABLE "cdp" DROP COLUMN "min_collateral_ratio"`);
        await queryRunner.query(`ALTER TABLE "cdp" DROP COLUMN "collateral_value"`);
        await queryRunner.query(`ALTER TABLE "cdp" DROP COLUMN "mint_value"`);
    }
}
