import {
  MsgStoreCode,
  MsgInstantiateContract,
  MsgExecuteContract,
  Coins,
  Key,
} from '@terra-money/terra.js'
import { ContractInfo } from '@terra-money/terra.js/dist/client/lcd/api/WasmAPI'
import * as fs from 'fs'
import { snakeCase, isObject, isArray } from 'lodash'
import * as logger from 'lib/logger'
import { lcd, transaction } from '.'

function toSnakeCase(obj: any): any {
  // eslint-disable-line
  if (isObject(obj) && !isArray(obj)) {
    const converted = {}
    Object.keys(obj).forEach((key) => {
      converted[snakeCase(key)] = toSnakeCase(obj[key])
    })
    return converted
  }

  return obj
}

export async function storeCode(path: string, key: Key): Promise<number> {
  const wasmBinary = fs.readFileSync(path)

  const tx = await transaction(lcd.wallet(key), [
    new MsgStoreCode(key.accAddress, wasmBinary.toString('base64')),
  ])

  try {
    const log = JSON.parse(tx.raw_log)
    const codeId = +log[0].events[1].attributes[1].value

    logger.info(`stored ${path}, codeId: ${codeId}`)

    return codeId
  } catch (error) {
    logger.info(`failed store code ${path}`)
    logger.info(tx)
    throw new Error(error)
  }
}

export async function instantiate(codeId: number, initMsg: object, key: Key): Promise<string> {
  const tx = await transaction(lcd.wallet(key), [
    new MsgInstantiateContract(key.accAddress, codeId, toSnakeCase(initMsg), new Coins([]), true),
  ])

  try {
    const log = JSON.parse(tx.raw_log)
    const contractAddress = log[0].events[0].attributes[2].value

    logger.info(`instantiated code ${codeId}, contractAddress: ${contractAddress}`)

    return contractAddress
  } catch (error) {
    logger.info(`failed instantiate code ${codeId}`)
    logger.info(tx)
    throw new Error(error)
  }
}

export async function contractInfo(address: string): Promise<ContractInfo> {
  return lcd.wasm.contractInfo(address)
}

export async function execute(address: string, msg: object, key: Key): Promise<void> {
  const tx = await transaction(lcd.wallet(key), [
    new MsgExecuteContract(key.accAddress, address, toSnakeCase(msg), new Coins([])),
  ])

  logger.info(tx)
}
