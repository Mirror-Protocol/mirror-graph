import fs from 'mz/fs'
import { Connection, BpfLoader, Account } from '@solana/web3.js'
import * as semver from 'semver'
import config from 'config'
import * as logger from 'lib/logger'
import { newSystemAccountWithAirdrop } from './client'

let connection

export async function getConnection(): Promise<Connection> {
  if (connection) return connection

  let newConnection = new Connection(config.SOLANA_URL)
  const version = await newConnection.getVersion()

  // commitment params are only supported >= 0.21.0
  const solanaCoreVersion = version['solana-core'].split(' ')[0]
  if (semver.gte(solanaCoreVersion, '0.21.0')) {
    newConnection = new Connection(config.SOLANA_URL, 'recent')
  }

  // require-atomic-updates
  connection = newConnection
  logger.info('Connection to cluster established:', config.SOLANA_URL, version)

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

  const from = await newSystemAccountWithAirdrop(conn, balanceNeeded)
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
