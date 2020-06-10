// @flow

import {
  sendAndConfirmTransaction as realSendAndConfirmTransaction,
  Account,
  Connection,
  Transaction,
} from '@solana/web3.js'

// import type { Account, Connection, Transaction } from '@solana/web3.js'
import YAML from 'json-to-pretty-yaml'

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function newAccountWithLamports(
  connection: Connection,
  lamports = 1000000
): Promise<Account> {
  const account = new Account()

  let retries = 10
  await connection.requestAirdrop(account.publicKey, lamports)

  for (;;) {
    await sleep(500)

    if (lamports === (await connection.getBalance(account.publicKey))) {
      return account
    }

    if (--retries <= 0) {
      break
    }

    console.log(`Airdrop retry ${retries}`)
  }

  throw new Error(`Airdrop of ${lamports} failed`)
}

/**
 * Create a new system account and airdrop it some lamports
 *
 * @private
 */
export async function newSystemAccountWithAirdrop(
  connection: Connection,
  lamports = 1
): Promise<Account> {
  const account = new Account()
  await connection.requestAirdrop(account.publicKey, lamports)
  return account
}

type TransactionNotification = (x: string, y: string) => void

let notify: TransactionNotification = () => undefined

export function onTransaction(callback: TransactionNotification): void {
  notify = callback
}

let payerAccount: Account | null = null
export async function sendAndConfirmTransaction(
  title: string,
  connection: Connection,
  transaction: Transaction,
  ...signers: Account[]
): Promise<void> {
  const when = Date.now()

  if (!payerAccount) {
    const { feeCalculator } = await connection.getRecentBlockhash()
    const fees = feeCalculator.lamportsPerSignature * 100 // wag
    const newPayerAccount = await newSystemAccountWithAirdrop(connection, fees)
    // eslint-disable-next-line require-atomic-updates
    payerAccount = payerAccount || newPayerAccount
  }

  signers.unshift(payerAccount)
  const signature = await realSendAndConfirmTransaction(connection, transaction, signers, {
    skipPreflight: true,
    confirmations: 1,
  })

  const body = {
    time: new Date(when).toString(),
    from: signers[0].publicKey.toBase58(),
    signature,
    instructions: transaction.instructions.map((i) => ({
      keys: i.keys.map((keyObj) => keyObj.pubkey.toBase58()),
      programId: i.programId.toBase58(),
      data: `0x${i.data.toString('hex')}`,
    })),
  }

  notify(title, YAML.stringify(body).replace(/"/g, ''))
}
