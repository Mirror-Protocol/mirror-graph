import * as fs from 'fs'
import { Container } from 'typedi'
import * as logger from 'lib/logger'
import { CodeIds } from 'types'
import { AssetService, GovService } from 'services'
import config from 'config'

export function loadCodeIds(): CodeIds {
  try {
    return JSON.parse(fs.readFileSync('./data/codeIds.json', 'utf8') || '{}')
  } catch (error) {
    logger.error('not provided codeIds.json')
    return undefined
  }
}

export function loadWhitelist(): { [symbol: string]: string} {
  try {
    return JSON.parse(fs.readFileSync('./whitelist.json', 'utf8') || '{}')
  } catch (error) {
    logger.error('not provided whitelist.json')
    return undefined
  }
}

export async function writeOracleAddresses(): Promise<void> {
  const assetService = Container.get(AssetService)
  const gov = Container.get(GovService).get()
  const assets = await assetService.getAll()

  const oracleInfo = {
    oracle: gov.oracle,
    assets: {}
  }

  for (const asset of assets) {
    if (asset.symbol === config.MIRROR_TOKEN_SYMBOL) {
      continue
    }
    oracleInfo.assets[asset.symbol.substring(1)] = asset.address
  }
  fs.writeFileSync('./data/address.json', JSON.stringify(oracleInfo))
  logger.info(oracleInfo)
}
