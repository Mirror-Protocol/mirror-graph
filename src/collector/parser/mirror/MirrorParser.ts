import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { Container } from 'typedi'
import { ContractEntity } from 'orm'
import {
  GovService,
  ContractService,
  AssetService,
  OraclePriceService,
  PriceService,
} from 'services'

export class MirrorParser {
  // return: entities to save
  public async parse(
    txInfo: TxInfo,
    msg: MsgExecuteContract,
    log: TxLog,
    contract: ContractEntity
  ): Promise<unknown[]> {
    throw new Error('must implement parse function')
  }

  get govService(): GovService {
    return Container.get(GovService)
  }

  get contractService(): ContractService {
    return Container.get(ContractService)
  }

  get assetService(): AssetService {
    return Container.get(AssetService)
  }

  get oraclePriceService(): OraclePriceService {
    return Container.get(OraclePriceService)
  }

  get priceService(): PriceService {
    return Container.get(PriceService)
  }
}
