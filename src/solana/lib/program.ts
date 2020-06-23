import * as fs from 'mz/fs'
import { BpfLoader, Account, PublicKey } from '@solana/web3.js'
import { sha256 } from 'crypto-hash'
import * as logger from 'lib/logger'
import { newAccountWithAirdrop } from './account'
import { getConnection } from './connection'
import BN = require('bn.js')

/**
 * Derive a program address from seeds and a program ID.
 */
export class ProgramAddress {
  static async create(seeds: string[], programId: PublicKey): Promise<PublicKey> {
    let buffer = Buffer.alloc(0)
    seeds.forEach((seed) => {
      buffer = Buffer.concat([buffer, Buffer.from(seed)])
    })
    buffer = Buffer.concat([buffer, programId.toBuffer(), Buffer.from('ProgramDerivedAddress')])
    let hash = await sha256(new Uint8Array(buffer))
    hash = await sha256(new Uint8Array(new BN(hash, 16).toBuffer()))
    return new PublicKey('0x' + hash)
  }
}

export async function loadProgram(path: string): Promise<Account> {
  const NUM_RETRIES = 500 /* allow some number of retries */
  const data = await fs.readFile(path)

  const conn = await getConnection()
  const { feeCalculator } = await conn.getRecentBlockhash()
  const balanceNeeded =
    feeCalculator.lamportsPerSignature *
      (BpfLoader.getMinNumSignatures(data.length) + NUM_RETRIES) +
    (await conn.getMinimumBalanceForRentExemption(data.length))

  const from = await newAccountWithAirdrop(conn, balanceNeeded)

  let programAcc: Account
  let attempts = 5
  for (; attempts > 0; attempts -= 1) {
    try {
      logger.info(`Loading ${path} program...`)
      programAcc = new Account()
      await BpfLoader.load(conn, from, programAcc, data)
      break
    } catch (err) {
      logger.error(`Error loading BPF program, ${attempts} attempts remaining:`, err.message)
    }
  }

  if (attempts === 0) {
    throw new Error('Unable to load program')
  }

  return programAcc
}
