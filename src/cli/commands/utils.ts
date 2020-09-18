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
  const contractService = Container.get(ContractService)
  const gov = Container.get(GovService).get()
  const assets = await assetService.getAll()

  const oracleContract = await contractService.get({ gov, type: ContractType.ORACLE })
  const oracleInfo = {
    oracle: oracleContract.address,
    assets: {}
  }

  for (const asset of assets) {
    if (asset.symbol === config.MIRROR_TOKEN_SYMBOL) {
      continue
    }
    const tokenContract = await contractService.get({ asset, type: ContractType.TOKEN })
    oracleInfo.assets[asset.symbol.substring(1)] = tokenContract.address
  }
  fs.writeFileSync('./address.json', JSON.stringify(oracleInfo))
  logger.info(oracleInfo)
}
