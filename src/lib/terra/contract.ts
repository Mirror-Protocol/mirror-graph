import {
  MsgStoreCode,
  MsgInstantiateContract,
  MsgExecuteContract,
  Coins,
  Wallet,
  Msg,
  TxInfo,
} from '@terra-money/terra.js'
import { ContractInfo } from 'types'
import * as fs from 'fs'
import * as logger from 'lib/logger'
import { toSnakeCase, toCamelCase } from 'lib/caseStyles'
import { lcd, transaction } from '.'

export async function storeCode(path: string, wallet: Wallet): Promise<number> {
  const wasmBinary = fs.readFileSync(path)

  const tx = await transaction(wallet, [
    new MsgStoreCode(wallet.key.accAddress, wasmBinary.toString('base64')),
  ])

  if (tx.code) {
    throw new Error(`[${tx.code}] ${tx.raw_log}`)
  }

  try {
    const codeId = +tx.logs[0].events[1].attributes[1].value

    logger.info(`stored ${path}, codeId: ${codeId}`)

    return codeId
  } catch (error) {
    logger.error(`failed store code ${path}`)
    throw new Error(tx.raw_log)
  }
}

export async function instantiate(
  codeId: number,
  initMsg: object,
  wallet: Wallet,
  sequence = undefined
): Promise<string> {
  const tx = await transaction(
    wallet,
    [
      new MsgInstantiateContract(
        wallet.key.accAddress,
        codeId,
        toSnakeCase(initMsg),
        new Coins([]),
        true
      ),
    ],
    sequence,
    300000
  )

  if (tx.code) {
    throw new Error(`[${tx.code}] ${tx.raw_log}`)
  }

  try {
    const contractAddress = tx.logs[0].events[0].attributes[2].value

    logger.info(`instantiated code ${codeId}, address: ${contractAddress}`)

    return contractAddress
  } catch (error) {
    logger.error(`failed instantiate code ${codeId}`)
    logger.error(tx.raw_log)
    throw new Error(error)
  }
}

export async function contractInfo(address: string): Promise<ContractInfo> {
  return toCamelCase(await lcd.wasm.contractInfo(address))
}

export async function contractQuery<T>(address: string, query: object): Promise<T> {
  return toCamelCase(await lcd.wasm.contractQuery<T>(address, toSnakeCase(query)))
}

export async function executeMsgs(msgs: Msg[], wallet: Wallet): Promise<TxInfo> {
  const tx = await transaction(wallet, msgs)

  if (tx.code) {
    throw new Error(`[${tx.code}] ${tx.raw_log}`)
  }

  try {
    if (!tx.logs[0].events[0].attributes[0].value) {
      throw new Error('execute contract failed')
    }

    return tx
  } catch (error) {
    logger.error(tx.raw_log)
    throw new Error(error)
  }
}

export async function execute(
  contractAddress: string,
  msg: object,
  wallet: Wallet,
  coins: Coins = new Coins([])
): Promise<TxInfo> {
  return executeMsgs(
    [new MsgExecuteContract(wallet.key.accAddress, contractAddress, toSnakeCase(msg), coins)],
    wallet
  )
}
