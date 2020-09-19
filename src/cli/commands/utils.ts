import * as fs from 'fs'
import { Container } from 'typedi'
import * as logger from 'lib/logger'
import { CodeIds, ContractType } from 'types'
import { AssetService, ContractService, GovService } from 'services'
import config from 'config'

export function loadCodeIds(): CodeIds {
  try {
    return JSON.parse(fs.readFileSync('./codeIds.json', 'utf8') || '{}')
  } catch (error) {
    logger.error('not provided codeIds.json')
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
  fs.writeFileSync('./address.json', JSON.stringify(oracleInfo))
  logger.info(oracleInfo)
}
