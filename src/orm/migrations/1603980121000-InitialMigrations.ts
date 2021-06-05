import {MigrationInterface, QueryRunner} from "typeorm";

export class InitialMigrations1603980121000 implements MigrationInterface {
    name = 'InitialMigrations1603980121000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "account" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "address" character varying NOT NULL, "is_app_user" boolean NOT NULL DEFAULT false, "email" character varying, CONSTRAINT "PK_83603c168bc00b20544539fbea6" PRIMARY KEY ("address"))`);
        await queryRunner.query(`CREATE TABLE "airdrop" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "network" character varying NOT NULL DEFAULT 'TERRA', "stage" integer NOT NULL, "address" character varying NOT NULL, "staked" numeric(40) NOT NULL DEFAULT '0', "total" numeric(40) NOT NULL DEFAULT '0', "rate" numeric(40,6) NOT NULL DEFAULT '0', "amount" numeric(40) NOT NULL DEFAULT '0', "proof" character varying NOT NULL, "merkle_root" character varying NOT NULL, "claimable" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_a6aea5b153cdf587fdbb38c5acc" PRIMARY KEY ("id")); COMMENT ON COLUMN "airdrop"."network" IS 'TERRA or ETH'; COMMENT ON COLUMN "airdrop"."staked" IS 'luna staked amount'; COMMENT ON COLUMN "airdrop"."total" IS 'total luna staked amount'; COMMENT ON COLUMN "airdrop"."rate" IS 'staked luna rate'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_airdrop_stage_address" ON "airdrop" ("stage", "address") `);
        await queryRunner.query(`CREATE TABLE "gov" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "chain_id" character varying NOT NULL, "gov" character varying NOT NULL, "mirror_token" character varying NOT NULL, "factory" character varying NOT NULL, "oracle" character varying NOT NULL, "mint" character varying NOT NULL, "staking" character varying NOT NULL, "token_factory" character varying NOT NULL, "collector" character varying NOT NULL, CONSTRAINT "PK_be6b858960c90e56c33a08ed21f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "balance" ("gov_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "address" character varying NOT NULL, "token" character varying NOT NULL, "average_price" numeric(40,6) NOT NULL, "balance" numeric(40) NOT NULL DEFAULT '0', "datetime" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PK_079dddd31a81672e8143a649ca0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6a18c33aeed8b1bff59a112854" ON "balance" ("address") `);
        await queryRunner.query(`CREATE INDEX "IDX_95fffae25a9f65fe39fc992e52" ON "balance" ("token") `);
        await queryRunner.query(`CREATE INDEX "IDX_9f4571dbeec220046e829ae1f2" ON "balance" ("datetime") `);
        await queryRunner.query(`CREATE TABLE "asset_positions" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "token" character varying NOT NULL, "mint" numeric(40) NOT NULL DEFAULT '0', "pool" numeric(40) NOT NULL DEFAULT '0', "uusd_pool" numeric(40) NOT NULL DEFAULT '0', "as_collateral" numeric(40) NOT NULL DEFAULT '0', "lp_shares" numeric(40) NOT NULL DEFAULT '0', "lp_staked" numeric(40) NOT NULL DEFAULT '0', CONSTRAINT "REL_07222f75a8c1127264c6ad98f3" UNIQUE ("token"), CONSTRAINT "PK_07222f75a8c1127264c6ad98f36" PRIMARY KEY ("token")); COMMENT ON COLUMN "asset_positions"."mint" IS 'total minted amount'; COMMENT ON COLUMN "asset_positions"."pool" IS 'current liquidity pool amount'; COMMENT ON COLUMN "asset_positions"."uusd_pool" IS 'current liquidity uusd pool amount'; COMMENT ON COLUMN "asset_positions"."as_collateral" IS 'total used as collateral amount'; COMMENT ON COLUMN "asset_positions"."lp_shares" IS 'total lp token supply'; COMMENT ON COLUMN "asset_positions"."lp_staked" IS 'staked lp token amount'`);
        await queryRunner.query(`CREATE TYPE "asset_status_enum" AS ENUM('NONE', 'LISTED', 'DELISTED')`);
        await queryRunner.query(`CREATE TABLE "asset" ("gov_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "token" character varying NOT NULL, "symbol" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying NOT NULL DEFAULT '', "lp_token" character varying NOT NULL, "pair" character varying NOT NULL, "status" "asset_status_enum" NOT NULL DEFAULT 'NONE', CONSTRAINT "PK_348480db9bb155697ece9f8b0f0" PRIMARY KEY ("token"))`);
        await queryRunner.query(`CREATE TYPE "contract_type_enum" AS ENUM('collector', 'factory', 'gov', 'limitOrder', 'mint', 'oracle', 'staking', 'token', 'lpToken', 'tokenFactory', 'pair', 'community', 'airdrop', 'collateralOracle', 'lock')`);
        await queryRunner.query(`CREATE TABLE "contract" ("gov_id" integer NOT NULL, "token" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "address" character varying NOT NULL, "type" "contract_type_enum" NOT NULL, CONSTRAINT "PK_4bbe5fb40812718baf74cc9a79e" PRIMARY KEY ("address"))`);
        await queryRunner.query(`CREATE INDEX "IDX_caccb141d9bb11309a68094acd" ON "contract" ("token") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_contract_address_type_gov" ON "contract" ("address", "type", "gov_id") `);
        await queryRunner.query(`CREATE TYPE "tx_type_enum" AS ENUM('BUY', 'SELL', 'SEND', 'RECEIVE', 'OPEN_POSITION', 'DEPOSIT_COLLATERAL', 'WITHDRAW_COLLATERAL', 'MINT', 'BURN', 'AUCTION', 'PROVIDE_LIQUIDITY', 'WITHDRAW_LIQUIDITY', 'STAKE', 'UNSTAKE', 'GOV_STAKE', 'GOV_UNSTAKE', 'GOV_CREATE_POLL', 'GOV_END_POLL', 'GOV_CAST_POLL', 'GOV_WITHDRAW_VOTING_REWARDS', 'WITHDRAW_REWARDS', 'CLAIM_AIRDROP', 'TERRA_SWAP', 'TERRA_SEND', 'TERRA_SWAP_SEND', 'TERRA_RECEIVE', 'REGISTRATION', 'BID_LIMIT_ORDER', 'ASK_LIMIT_ORDER', 'CANCEL_LIMIT_ORDER', 'EXECUTE_LIMIT_ORDER')`);
        await queryRunner.query(`CREATE TABLE "tx" ("gov_id" integer NOT NULL, "token" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "height" integer NOT NULL, "tx_hash" character varying NOT NULL, "address" character varying NOT NULL, "type" "tx_type_enum" NOT NULL, "data" jsonb NOT NULL, "volume" numeric(40) NOT NULL DEFAULT '0', "commission_value" numeric(40) NOT NULL DEFAULT '0', "uusd_change" numeric(40) NOT NULL DEFAULT '0', "fee" character varying NOT NULL DEFAULT '0uusd', "memo" character varying, "tags" text NOT NULL DEFAULT '{}', "datetime" TIMESTAMP NOT NULL, "contract_id" character varying, CONSTRAINT "PK_2e04a1db73a003a59dcd4fe916b" PRIMARY KEY ("id")); COMMENT ON COLUMN "tx"."volume" IS 'uusd volume'; COMMENT ON COLUMN "tx"."commission_value" IS 'uusd commission fee value'; COMMENT ON COLUMN "tx"."uusd_change" IS 'uusd change value'`);
        await queryRunner.query(`CREATE INDEX "IDX_7f26f3452832a7df42304b8598" ON "tx" ("token") `);
        await queryRunner.query(`CREATE INDEX "idx_tx_address_datetime_gov" ON "tx" ("address", "datetime", "gov_id") `);
        await queryRunner.query(`CREATE TABLE "asset_news" ("token" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "datetime" TIMESTAMP NOT NULL, "headline" character varying NOT NULL, "source" character varying NOT NULL, "url" character varying NOT NULL, "summary" character varying NOT NULL, CONSTRAINT "PK_e9c73396acfd830e5b630a32fbf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ba38d68df69007c999ea5b47ae" ON "asset_news" ("token") `);
        await queryRunner.query(`CREATE TYPE "asset_statistic_daily_network_enum" AS ENUM('TERRA', 'ETH', 'BSC', 'COMBINE')`);
        await queryRunner.query(`CREATE TYPE "asset_statistic_hourly_network_enum" AS ENUM('TERRA', 'ETH', 'BSC', 'COMBINE')`);
        await queryRunner.query(`CREATE TABLE "cdp" ("token" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "id" numeric(40) NOT NULL DEFAULT '0', "address" character varying NOT NULL, "mint_amount" numeric(40) NOT NULL DEFAULT '0', "collateral_token" character varying NOT NULL, "collateral_amount" numeric(40) NOT NULL DEFAULT '0', "collateral_ratio" numeric(40,6) NOT NULL DEFAULT '0', CONSTRAINT "PK_48b430c1c9f795175978c188b95" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1f54d4137ffa40e873a60a453f" ON "cdp" ("token") `);
        await queryRunner.query(`CREATE INDEX "IDX_4cd53a029b342057e140d623d4" ON "cdp" ("address") `);
        await queryRunner.query(`CREATE TABLE "daily_statistic" ("gov_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "datetime" TIMESTAMP NOT NULL, "cumulative_liquidity" numeric(40) NOT NULL DEFAULT '0', "trading_volume" numeric(40) NOT NULL DEFAULT '0', CONSTRAINT "PK_be3fc1b00ed3c24d68b30614813" PRIMARY KEY ("id")); COMMENT ON COLUMN "daily_statistic"."cumulative_liquidity" IS 'cumulative liquidity ust value'; COMMENT ON COLUMN "daily_statistic"."trading_volume" IS 'trading volume of today'`);
        await queryRunner.query(`CREATE INDEX "IDX_8077593d60af57619da6c59f8f" ON "daily_statistic" ("datetime") `);
        await queryRunner.query(`CREATE TYPE "limit_order_type_enum" AS ENUM('ASK', 'BID')`);
        await queryRunner.query(`CREATE TABLE "limit_order" ("token" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "id" numeric(40) NOT NULL DEFAULT '0', "address" character varying NOT NULL, "type" "limit_order_type_enum" NOT NULL, "price" numeric(40,6) NOT NULL, "amount" numeric(40) NOT NULL, "uusd_amount" numeric(40) NOT NULL, "filled_amount" numeric(40) NOT NULL DEFAULT '0', "filled_uusd_amount" numeric(40) NOT NULL DEFAULT '0', CONSTRAINT "PK_4acb57b3cb71ae3d169c6b804a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9e57e4732c452ab1b16a96c3de" ON "limit_order" ("token") `);
        await queryRunner.query(`CREATE INDEX "IDX_dd476384f7762cd5632d8c84a2" ON "limit_order" ("address") `);
        await queryRunner.query(`CREATE TABLE "reward" ("token" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "height" integer NOT NULL, "tx_hash" character varying NOT NULL, "amount" numeric(40) NOT NULL DEFAULT '0', "is_gov_reward" boolean NOT NULL DEFAULT false, "datetime" TIMESTAMP NOT NULL, CONSTRAINT "PK_a90ea606c229e380fb341838036" PRIMARY KEY ("id")); COMMENT ON COLUMN "reward"."amount" IS 'minted reward amount'`);
        await queryRunner.query(`CREATE INDEX "IDX_f6b1f921485296ca9ee2a32e11" ON "reward" ("token") `);
        await queryRunner.query(`CREATE INDEX "IDX_c43a6204af11d3c4f685b04c56" ON "reward" ("datetime") `);
        await queryRunner.query(`CREATE TABLE "price" ("token" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "datetime" TIMESTAMP NOT NULL, "open" numeric(40,6) NOT NULL, "high" numeric(40,6) NOT NULL, "low" numeric(40,6) NOT NULL, "close" numeric(40,6) NOT NULL, CONSTRAINT "PK_d163e55e8cce6908b2e0f27cea4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0cc67bf87e6c3a16e56327ef3c" ON "price" ("token") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_price_datetime_asset" ON "price" ("datetime", "token") `);
        await queryRunner.query(`CREATE TABLE "oracle_price" ("token" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "datetime" TIMESTAMP NOT NULL, "open" numeric(40,6) NOT NULL, "high" numeric(40,6) NOT NULL, "low" numeric(40,6) NOT NULL, "close" numeric(40,6) NOT NULL, "price_multiplier" numeric(40,6) NOT NULL DEFAULT '1', CONSTRAINT "PK_606c938b2474588b154eb625f3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a9fe8ae645bfadb6711f1ea5a5" ON "oracle_price" ("token") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_oracle_price_datetime_asset" ON "oracle_price" ("datetime", "token") `);
        await queryRunner.query(`CREATE TABLE "block" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "chain_id" character varying NOT NULL, "height" integer NOT NULL, CONSTRAINT "PK_d0925763efb591c2e2ffb267572" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_block_chainid_height" ON "block" ("chain_id", "height") `);
        await queryRunner.query(`CREATE TABLE "tx_hash" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "height" integer NOT NULL, "tx_hash" character varying NOT NULL, "datetime" TIMESTAMP NOT NULL, CONSTRAINT "PK_0c521e7e4ac94bead66f24ef885" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_txhash_height_datetime" ON "tx_hash" ("height", "tx_hash", "datetime") `);
        await queryRunner.query(`ALTER TABLE "balance" ADD CONSTRAINT "FK_fb5e60ba5ce1a7366ee810aff2a" FOREIGN KEY ("gov_id") REFERENCES "gov"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_positions" ADD CONSTRAINT "FK_07222f75a8c1127264c6ad98f36" FOREIGN KEY ("token") REFERENCES "asset"("token") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset" ADD CONSTRAINT "FK_5272d8c7e362ded463bec733e91" FOREIGN KEY ("gov_id") REFERENCES "gov"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contract" ADD CONSTRAINT "FK_b50271c2daf7d6fd73325c491a9" FOREIGN KEY ("gov_id") REFERENCES "gov"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contract" ADD CONSTRAINT "FK_caccb141d9bb11309a68094acdb" FOREIGN KEY ("token") REFERENCES "asset"("token") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tx" ADD CONSTRAINT "FK_b156da7dd699b49b5eaaeef245f" FOREIGN KEY ("gov_id") REFERENCES "gov"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tx" ADD CONSTRAINT "FK_7f26f3452832a7df42304b8598f" FOREIGN KEY ("token") REFERENCES "asset"("token") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tx" ADD CONSTRAINT "FK_c538e5866e68eb61c28a7957d03" FOREIGN KEY ("contract_id") REFERENCES "contract"("address") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_news" ADD CONSTRAINT "FK_ba38d68df69007c999ea5b47aef" FOREIGN KEY ("token") REFERENCES "asset"("token") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cdp" ADD CONSTRAINT "FK_1f54d4137ffa40e873a60a453fa" FOREIGN KEY ("token") REFERENCES "asset"("token") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "daily_statistic" ADD CONSTRAINT "FK_b36c501dc0e7672ee1525749823" FOREIGN KEY ("gov_id") REFERENCES "gov"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "limit_order" ADD CONSTRAINT "FK_9e57e4732c452ab1b16a96c3dea" FOREIGN KEY ("token") REFERENCES "asset"("token") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward" ADD CONSTRAINT "FK_f6b1f921485296ca9ee2a32e119" FOREIGN KEY ("token") REFERENCES "asset"("token") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "price" ADD CONSTRAINT "FK_0cc67bf87e6c3a16e56327ef3cd" FOREIGN KEY ("token") REFERENCES "asset"("token") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "oracle_price" ADD CONSTRAINT "FK_a9fe8ae645bfadb6711f1ea5a57" FOREIGN KEY ("token") REFERENCES "asset"("token") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oracle_price" DROP CONSTRAINT "FK_a9fe8ae645bfadb6711f1ea5a57"`);
        await queryRunner.query(`ALTER TABLE "price" DROP CONSTRAINT "FK_0cc67bf87e6c3a16e56327ef3cd"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP CONSTRAINT "FK_f6b1f921485296ca9ee2a32e119"`);
        await queryRunner.query(`ALTER TABLE "limit_order" DROP CONSTRAINT "FK_9e57e4732c452ab1b16a96c3dea"`);
        await queryRunner.query(`ALTER TABLE "daily_statistic" DROP CONSTRAINT "FK_b36c501dc0e7672ee1525749823"`);
        await queryRunner.query(`ALTER TABLE "cdp" DROP CONSTRAINT "FK_1f54d4137ffa40e873a60a453fa"`);
        await queryRunner.query(`ALTER TABLE "asset_news" DROP CONSTRAINT "FK_ba38d68df69007c999ea5b47aef"`);
        await queryRunner.query(`ALTER TABLE "tx" DROP CONSTRAINT "FK_c538e5866e68eb61c28a7957d03"`);
        await queryRunner.query(`ALTER TABLE "tx" DROP CONSTRAINT "FK_7f26f3452832a7df42304b8598f"`);
        await queryRunner.query(`ALTER TABLE "tx" DROP CONSTRAINT "FK_b156da7dd699b49b5eaaeef245f"`);
        await queryRunner.query(`ALTER TABLE "contract" DROP CONSTRAINT "FK_caccb141d9bb11309a68094acdb"`);
        await queryRunner.query(`ALTER TABLE "contract" DROP CONSTRAINT "FK_b50271c2daf7d6fd73325c491a9"`);
        await queryRunner.query(`ALTER TABLE "asset" DROP CONSTRAINT "FK_5272d8c7e362ded463bec733e91"`);
        await queryRunner.query(`ALTER TABLE "asset_positions" DROP CONSTRAINT "FK_07222f75a8c1127264c6ad98f36"`);
        await queryRunner.query(`ALTER TABLE "balance" DROP CONSTRAINT "FK_fb5e60ba5ce1a7366ee810aff2a"`);
        await queryRunner.query(`DROP INDEX "idx_txhash_height_datetime"`);
        await queryRunner.query(`DROP TABLE "tx_hash"`);
        await queryRunner.query(`DROP INDEX "idx_block_chainid_height"`);
        await queryRunner.query(`DROP TABLE "block"`);
        await queryRunner.query(`DROP INDEX "idx_oracle_price_datetime_asset"`);
        await queryRunner.query(`DROP INDEX "IDX_a9fe8ae645bfadb6711f1ea5a5"`);
        await queryRunner.query(`DROP TABLE "oracle_price"`);
        await queryRunner.query(`DROP INDEX "idx_price_datetime_asset"`);
        await queryRunner.query(`DROP INDEX "IDX_0cc67bf87e6c3a16e56327ef3c"`);
        await queryRunner.query(`DROP TABLE "price"`);
        await queryRunner.query(`DROP INDEX "IDX_c43a6204af11d3c4f685b04c56"`);
        await queryRunner.query(`DROP INDEX "IDX_f6b1f921485296ca9ee2a32e11"`);
        await queryRunner.query(`DROP TABLE "reward"`);
        await queryRunner.query(`DROP INDEX "IDX_dd476384f7762cd5632d8c84a2"`);
        await queryRunner.query(`DROP INDEX "IDX_9e57e4732c452ab1b16a96c3de"`);
        await queryRunner.query(`DROP TABLE "limit_order"`);
        await queryRunner.query(`DROP TYPE "limit_order_type_enum"`);
        await queryRunner.query(`DROP INDEX "IDX_8077593d60af57619da6c59f8f"`);
        await queryRunner.query(`DROP TABLE "daily_statistic"`);
        await queryRunner.query(`DROP INDEX "IDX_4cd53a029b342057e140d623d4"`);
        await queryRunner.query(`DROP INDEX "IDX_1f54d4137ffa40e873a60a453f"`);
        await queryRunner.query(`DROP TABLE "cdp"`);
        await queryRunner.query(`DROP INDEX "IDX_0494616f9a5a22f93ca647b502"`);
        await queryRunner.query(`DROP INDEX "IDX_d84dd7e0358e021d2e298f2a73"`);
        await queryRunner.query(`DROP INDEX "IDX_60b2951b941a45e5c197de65d2"`);
        await queryRunner.query(`DROP TYPE "asset_statistic_hourly_network_enum"`);
        await queryRunner.query(`DROP INDEX "IDX_fdf3859b4a452b98acbe4bd1bb"`);
        await queryRunner.query(`DROP INDEX "IDX_03839a4d965a7ec627d28d2d95"`);
        await queryRunner.query(`DROP INDEX "IDX_10e31fe4b36810e82b51211656"`);
        await queryRunner.query(`DROP TYPE "asset_statistic_daily_network_enum"`);
        await queryRunner.query(`DROP INDEX "IDX_ba38d68df69007c999ea5b47ae"`);
        await queryRunner.query(`DROP TABLE "asset_news"`);
        await queryRunner.query(`DROP INDEX "idx_tx_address_datetime_gov"`);
        await queryRunner.query(`DROP INDEX "IDX_7f26f3452832a7df42304b8598"`);
        await queryRunner.query(`DROP TABLE "tx"`);
        await queryRunner.query(`DROP TYPE "tx_type_enum"`);
        await queryRunner.query(`DROP INDEX "idx_contract_address_type_gov"`);
        await queryRunner.query(`DROP INDEX "IDX_caccb141d9bb11309a68094acd"`);
        await queryRunner.query(`DROP TABLE "contract"`);
        await queryRunner.query(`DROP TYPE "contract_type_enum"`);
        await queryRunner.query(`DROP TABLE "asset"`);
        await queryRunner.query(`DROP TYPE "asset_status_enum"`);
        await queryRunner.query(`DROP TABLE "asset_positions"`);
        await queryRunner.query(`DROP INDEX "IDX_9f4571dbeec220046e829ae1f2"`);
        await queryRunner.query(`DROP INDEX "IDX_95fffae25a9f65fe39fc992e52"`);
        await queryRunner.query(`DROP INDEX "IDX_6a18c33aeed8b1bff59a112854"`);
        await queryRunner.query(`DROP TABLE "balance"`);
        await queryRunner.query(`DROP TABLE "gov"`);
        await queryRunner.query(`DROP INDEX "idx_airdrop_stage_address"`);
        await queryRunner.query(`DROP TABLE "airdrop"`);
        await queryRunner.query(`DROP TABLE "account"`);
    }

}