import { MigrationInterface, QueryRunner } from 'typeorm'

export class TxType1623646016084 implements MigrationInterface {
  name = 'TxType1623646016084'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "tx_type_enum" RENAME TO "tx_type_enum_old"`)
    await queryRunner.query(
      `CREATE TYPE "tx_type_enum" AS ENUM('BUY', 'SELL', 'SEND', 'RECEIVE', 'OPEN_POSITION', 'DEPOSIT_COLLATERAL', 'WITHDRAW_COLLATERAL', 'MINT', 'BURN', 'AUCTION', 'PROVIDE_LIQUIDITY', 'WITHDRAW_LIQUIDITY', 'STAKE', 'UNSTAKE', 'GOV_STAKE', 'GOV_UNSTAKE', 'GOV_CREATE_POLL', 'GOV_END_POLL', 'GOV_CAST_POLL', 'GOV_WITHDRAW_VOTING_REWARDS', 'WITHDRAW_REWARDS', 'CLAIM_AIRDROP', 'TERRA_SWAP', 'TERRA_SEND', 'TERRA_SWAP_SEND', 'TERRA_RECEIVE', 'REGISTRATION', 'BID_LIMIT_ORDER', 'ASK_LIMIT_ORDER', 'CANCEL_LIMIT_ORDER', 'EXECUTE_LIMIT_ORDER', 'WITHDRAW_UNLOCKED_UST', 'WITHDRAW_UNLOCKED_UST_ALL')`
    )
    await queryRunner.query(
      `ALTER TABLE "tx" ALTER COLUMN "type" TYPE "tx_type_enum" USING "type"::"text"::"tx_type_enum"`
    )
    await queryRunner.query(`DROP TYPE "tx_type_enum_old"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "tx_type_enum_old" AS ENUM('BUY', 'SELL', 'SEND', 'RECEIVE', 'OPEN_POSITION', 'DEPOSIT_COLLATERAL', 'WITHDRAW_COLLATERAL', 'MINT', 'BURN', 'AUCTION', 'PROVIDE_LIQUIDITY', 'WITHDRAW_LIQUIDITY', 'STAKE', 'UNSTAKE', 'GOV_STAKE', 'GOV_UNSTAKE', 'GOV_CREATE_POLL', 'GOV_END_POLL', 'GOV_CAST_POLL', 'GOV_WITHDRAW_VOTING_REWARDS', 'WITHDRAW_REWARDS', 'CLAIM_AIRDROP', 'TERRA_SWAP', 'TERRA_SEND', 'TERRA_SWAP_SEND', 'TERRA_RECEIVE', 'REGISTRATION', 'BID_LIMIT_ORDER', 'ASK_LIMIT_ORDER', 'CANCEL_LIMIT_ORDER', 'EXECUTE_LIMIT_ORDER')`
    )
    await queryRunner.query(
      `ALTER TABLE "tx" ALTER COLUMN "type" TYPE "tx_type_enum_old" USING "type"::"text"::"tx_type_enum_old"`
    )
    await queryRunner.query(`DROP TYPE "tx_type_enum"`)
    await queryRunner.query(`ALTER TYPE "tx_type_enum_old" RENAME TO "tx_type_enum"`)
  }
}
