import * as Bluebird from 'bluebird'
import { Account, Connection } from '@solana/web3.js'

export async function newSystemAccount(
  connection: Connection,
  lamports = 1000000
): Promise<Account> {
  const account = new Account()

  await connection.requestAirdrop(account.publicKey, lamports)

  for (let retries = 0; retries < 10; retries += 1) {
    await Bluebird.delay(500)

    if (lamports === (await connection.getBalance(account.publicKey))) {
      return account
    }
  }

  throw new Error(`Airdrop of ${lamports} failed`)
}
