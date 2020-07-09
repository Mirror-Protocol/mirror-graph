import { MsgStoreCode, MsgInstantiateContract, Coins } from '@terra-money/terra.js'
import * as fs from 'fs'
import * as logger from 'lib/logger'
import { RawKey } from './RawKey'
import { lcd, transaction } from '.'

export async function storeCode(path: string, privateKey: Buffer): Promise<number> {
  const wasmBinary = fs.readFileSync(path)
  const key = new RawKey(privateKey)

  const tx = await transaction(lcd.wallet(key), [
    new MsgStoreCode(key.accAddress, wasmBinary.toString('base64')),
  ])

  const log = JSON.parse(tx.raw_log)
  const codeId = +log[0].events[1].attributes[1].value

  logger.info(`stored ${path}, codeId: ${codeId}`)

  return codeId
}

export async function instantiateContract(
  codeId: number,
  initMsg: object,
  privateKey: Buffer
): Promise<string> {
  const key = new RawKey(privateKey)

  const tx = await transaction(lcd.wallet(key), [
    new MsgInstantiateContract(key.accAddress, codeId.toString(), initMsg, new Coins([]), false),
  ])

  const log = JSON.parse(tx.raw_log)
  const contractAddress = log[0].events[0].attributes[2].value

  logger.info(`instantiated code ${codeId}, contractAddress: ${contractAddress}`)

  return contractAddress
}
