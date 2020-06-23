import * as Bluebird from 'bluebird'
import { Account, Connection } from '@solana/web3.js'
import * as logger from 'lib/logger'

export async function newAccountWithAirdrop(
  connection: Connection,
  lamports = 1000000,
  waitTransaction = true
): Promise<Account> {
  const account = new Account()

  await connection.requestAirdrop(account.publicKey, lamports)

  if (!waitTransaction) {
    return account
  }

  for (let retries = 0; retries < 10; retries += 1) {
    await Bluebird.delay(1000)

    const balance = await connection.getBalance(account.publicKey)
    if (lamports === balance) {
      return account
    }

    logger.info(`Waiting for airdrop.. balance ${balance}/${lamports}, try ${retries + 1}/10`)
  }

  throw new Error(`Airdrop of ${lamports} failed`)
}
