import * as Bluebird from 'bluebird'
import { Account, Connection } from '@solana/web3.js'
import { encrypt } from 'lib/crypto'
import * as logger from 'lib/logger'

export async function newAccountWithAirdrop(
  connection: Connection,
  lamports = 1000000
): Promise<Account> {
  const account = new Account()

  await connection.requestAirdrop(account.publicKey, lamports)

  for (let retries = 0; retries < 10; retries += 1) {
    await Bluebird.delay(500)

    const balance = await connection.getBalance(account.publicKey)
    if (lamports === balance) {
      return account
    }

    logger.info(
      `Waiting for airdrop.. current balance ${balance}/${lamports}, try ${retries + 1}/10`
    )
  }

  throw new Error(`Airdrop of ${lamports} failed`)
}

export function accountToJSON(
  account: Account,
  encryptKey?: string
): { publicKey: string; secretKey: string } {
  return {
    publicKey: account.publicKey.toBase58(),
    secretKey: encryptKey
      ? encrypt(account.secretKey.toString(), encryptKey)
      : account.secretKey.toString(),
  }
}
