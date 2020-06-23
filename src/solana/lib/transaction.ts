import { sendAndConfirmTransaction, Account, Connection, Transaction } from '@solana/web3.js'
import { newAccountWithAirdrop } from './account'

export interface TransactionResult {
  time: number
  from: string
  signature: string
  instructions: {
    keys: string[]
    programId: string
    data: string
  }[]
}

let payerAccount: Account | null = null

export async function sendTransaction(
  connection: Connection,
  transaction: Transaction,
  ...signers: Account[]
): Promise<TransactionResult> {
  if (!payerAccount) {
    const { feeCalculator } = await connection.getRecentBlockhash()
    const fees = feeCalculator.lamportsPerSignature * 100 // wag
    payerAccount = await newAccountWithAirdrop(connection, fees, false)
  }

  signers.unshift(payerAccount)
  const signature = await sendAndConfirmTransaction(connection, transaction, signers, {
    skipPreflight: true,
    confirmations: 1,
  })

  return {
    time: Date.now(),
    from: signers[0].publicKey.toBase58(),
    signature,
    instructions: transaction.instructions.map((i) => ({
      keys: i.keys.map((keyObj) => keyObj.pubkey.toBase58()),
      programId: i.programId.toBase58(),
      data: `0x${i.data.toString('hex')}`,
    })),
  }
}
