import {
  MsgStoreCode,
  MsgInstantiateContract,
  MsgExecuteContract,
  Coins,
  Key,
} from '@terra-money/terra.js'
import { ContractInfo } from 'orm'
import * as fs from 'fs'
import * as logger from 'lib/logger'
import { toSnakeCase, toCamelCase } from 'lib/caseStyles'
import { lcd, transaction } from '.'

export async function storeCode(path: string, key: Key): Promise<number> {
  const wasmBinary = fs.readFileSync(path)

  const tx = await transaction(lcd.wallet(key), [
    new MsgStoreCode(key.accAddress, wasmBinary.toString('base64')),
  ])

  if (tx.code) {
    throw new Error(`[${tx.code}] ${tx.raw_log}`)
  }

  try {
    const log = JSON.parse(tx.raw_log)
    const codeId = +log[0].events[1].attributes[1].value

    logger.info(`stored ${path}, codeId: ${codeId}`)

    return codeId
  } catch (error) {
    logger.error(`failed store code ${path}`)
    throw new Error(tx.raw_log)
  }
}

export async function instantiate(codeId: number, initMsg: object, key: Key): Promise<string> {
  const tx = await transaction(lcd.wallet(key), [
    new MsgInstantiateContract(key.accAddress, codeId, toSnakeCase(initMsg), new Coins([]), true),
  ])

  if (tx.code) {
    throw new Error(`[${tx.code}] ${tx.raw_log}`)
  }

  try {
    const log = JSON.parse(tx.raw_log)
    const contractAddress = log[0].events[0].attributes[2].value

    logger.info(`instantiated code ${codeId}, contractAddress: ${contractAddress}`)

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

export async function execute(
  contractAddress: string,
  msg: object,
  key: Key,
  coins: Coins = new Coins([])
): Promise<void> {
  const tx = await transaction(lcd.wallet(key), [
    new MsgExecuteContract(key.accAddress, contractAddress, toSnakeCase(msg), coins),
  ])

  if (tx.code) {
    throw new Error(`[${tx.code}] ${tx.raw_log}`)
  }

  try {
    const log = JSON.parse(tx.raw_log)
    const contractAddress = log[0].events[0].attributes[0].value

    logger.info(`execute contract ${contractAddress} success`)
    logger.info(tx)
  } catch (error) {
    logger.error(`execute contract ${contractAddress} failed`)
    logger.error(tx.raw_log)
    throw new Error(error)
  }
}
