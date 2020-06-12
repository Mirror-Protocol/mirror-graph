import * as fs from 'mz/fs'
import { Connection, BpfLoader, Account, PublicKey } from '@solana/web3.js'
import { sha256 } from 'crypto-hash'
import * as semver from 'semver'
import * as logger from 'lib/logger'
import { newSystemAccount } from './account'
import { url } from './url'
import BN = require('bn.js')

/**
 * Derive a program address from seeds and a program ID.
 */
export class ProgramAddress {
  static async create(seeds: string[], programID: PublicKey): Promise<PublicKey> {
    let buffer = Buffer.alloc(0)
    seeds.forEach((seed) => {
      buffer = Buffer.concat([buffer, Buffer.from(seed)])
    })
    buffer = Buffer.concat([buffer, programID.toBuffer(), Buffer.from('ProgramDerivedAddress')])
    let hash = await sha256(new Uint8Array(buffer))
    hash = await sha256(new Uint8Array(new BN(hash, 16).toBuffer()))
    return new PublicKey('0x' + hash)
  }
}

let connection

export async function getConnection(): Promise<Connection> {
  if (connection) return connection

  let newConnection = new Connection(url)
  const version = await newConnection.getVersion()

  // commitment params are only supported >= 0.21.0
  const solanaCoreVersion = version['solana-core'].split(' ')[0]
  if (semver.gte(solanaCoreVersion, '0.21.0')) {
    newConnection = new Connection(url, 'recent')
  }

  // require-atomic-updates
  connection = newConnection
  logger.info('Connection to cluster established:', url, version)

  return connection
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

  const from = await newSystemAccount(conn, balanceNeeded)
  logger.info(`Loading ${path} program...`)

  let programAcc = new Account()
  let attempts = 5
  while (attempts > 0) {
    try {
      logger.info('Loading BPF program...')
      await BpfLoader.load(conn, from, programAcc, data)
      break
    } catch (err) {
      programAcc = new Account()
      attempts -= 1
      logger.error(`Error loading BPF program, ${attempts} attempts remaining:`, err.message)
    }
  }

  if (attempts === 0) {
    throw new Error('Unable to load program')
  }

  return programAcc
}
