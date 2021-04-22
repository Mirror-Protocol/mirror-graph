import {MigrationInterface, QueryRunner} from "typeorm";

export class AssetStatistic1618815567435 implements MigrationInterface {
    name = 'AssetStatistic1618815567435'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "asset_statistic_daily" ("token" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "datetime" TIMESTAMP NOT NULL, "network" "asset_statistic_daily_network_enum" NOT NULL, "pool" numeric(40) NOT NULL DEFAULT '0', "uusd_pool" numeric(40) NOT NULL DEFAULT '0', "liquidity" numeric(40) NOT NULL DEFAULT '0', "volume" numeric(40) NOT NULL DEFAULT '0', "fee" numeric(40) NOT NULL DEFAULT '0', "transactions" numeric(40) NOT NULL DEFAULT '0', CONSTRAINT "PK_5b973a2f449b214358ff68b1ea7" PRIMARY KEY ("id")); COMMENT ON COLUMN "asset_statistic_daily"."pool" IS 'liquidity pool amount'; COMMENT ON COLUMN "asset_statistic_daily"."uusd_pool" IS 'liquidity uusd pool amount'; COMMENT ON COLUMN "asset_statistic_daily"."liquidity" IS 'liquidity value'; COMMENT ON COLUMN "asset_statistic_daily"."volume" IS 'trading volume'; COMMENT ON COLUMN "asset_statistic_daily"."fee" IS 'trading fee volume'; COMMENT ON COLUMN "asset_statistic_daily"."transactions" IS 'trading count'`);
        await queryRunner.query(`CREATE INDEX "IDX_10e31fe4b36810e82b51211656" ON "asset_statistic_daily" ("token") `);
        await queryRunner.query(`CREATE INDEX "IDX_03839a4d965a7ec627d28d2d95" ON "asset_statistic_daily" ("datetime") `);
        await queryRunner.query(`CREATE INDEX "IDX_fdf3859b4a452b98acbe4bd1bb" ON "asset_statistic_daily" ("network") `);
        await queryRunner.query(`CREATE TABLE "asset_statistic_hourly" ("token" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "datetime" TIMESTAMP NOT NULL, "network" "asset_statistic_hourly_network_enum" NOT NULL, "pool" numeric(40) NOT NULL DEFAULT '0', "uusd_pool" numeric(40) NOT NULL DEFAULT '0', "liquidity" numeric(40) NOT NULL DEFAULT '0', "volume" numeric(40) NOT NULL DEFAULT '0', "fee" numeric(40) NOT NULL DEFAULT '0', "transactions" numeric(40) NOT NULL DEFAULT '0', CONSTRAINT "PK_cd238f4340a4caf533552971ef2" PRIMARY KEY ("id")); COMMENT ON COLUMN "asset_statistic_hourly"."pool" IS 'liquidity pool amount'; COMMENT ON COLUMN "asset_statistic_hourly"."uusd_pool" IS 'liquidity uusd pool amount'; COMMENT ON COLUMN "asset_statistic_hourly"."liquidity" IS 'liquidity value'; COMMENT ON COLUMN "asset_statistic_hourly"."volume" IS 'trading volume'; COMMENT ON COLUMN "asset_statistic_hourly"."fee" IS 'trading fee volume'; COMMENT ON COLUMN "asset_statistic_hourly"."transactions" IS 'trading count'`);
        await queryRunner.query(`CREATE INDEX "IDX_60b2951b941a45e5c197de65d2" ON "asset_statistic_hourly" ("token") `);
        await queryRunner.query(`CREATE INDEX "IDX_d84dd7e0358e021d2e298f2a73" ON "asset_statistic_hourly" ("datetime") `);
        await queryRunner.query(`CREATE INDEX "IDX_0494616f9a5a22f93ca647b502" ON "asset_statistic_hourly" ("network") `);
        await queryRunner.query(`COMMENT ON COLUMN "balance"."datetime" IS NULL`);
        await queryRunner.query(`ALTER TABLE "asset_statistic_daily" ADD CONSTRAINT "FK_10e31fe4b36810e82b51211656b" FOREIGN KEY ("token") REFERENCES "asset"("token") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_statistic_hourly" ADD CONSTRAINT "FK_60b2951b941a45e5c197de65d27" FOREIGN KEY ("token") REFERENCES "asset"("token") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset_statistic_hourly" DROP CONSTRAINT "FK_60b2951b941a45e5c197de65d27"`);
        await queryRunner.query(`ALTER TABLE "asset_statistic_daily" DROP CONSTRAINT "FK_10e31fe4b36810e82b51211656b"`);
        await queryRunner.query(`COMMENT ON COLUMN "balance"."datetime" IS NULL`);
        await queryRunner.query(`DROP INDEX "IDX_0494616f9a5a22f93ca647b502"`);
        await queryRunner.query(`DROP INDEX "IDX_d84dd7e0358e021d2e298f2a73"`);
        await queryRunner.query(`DROP INDEX "IDX_60b2951b941a45e5c197de65d2"`);
        await queryRunner.query(`DROP TABLE "asset_statistic_hourly"`);
        await queryRunner.query(`DROP INDEX "IDX_fdf3859b4a452b98acbe4bd1bb"`);
        await queryRunner.query(`DROP INDEX "IDX_03839a4d965a7ec627d28d2d95"`);
        await queryRunner.query(`DROP INDEX "IDX_10e31fe4b36810e82b51211656"`);
        await queryRunner.query(`DROP TABLE "asset_statistic_daily"`);
    }

}
