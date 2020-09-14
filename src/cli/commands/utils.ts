import * as fs from 'fs'
import { Container } from 'typedi'
import * as logger from 'lib/logger'
import { CodeIds, ContractType } from 'types'
import { AssetService, ContractService } from 'services'
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
  const assets = await assetService.getAll()
  const address = {}

  for (const asset of assets) {
    if (asset.symbol === config.MIRROR_TOKEN_SYMBOL) {
      continue
    }
    const oracleContract = await contractService.get({ asset, type: ContractType.ORACLE })
    address[asset.symbol.substring(1)] = oracleContract.address
  }
  fs.writeFileSync('./address.json', JSON.stringify(address))
  logger.info(address)
}
