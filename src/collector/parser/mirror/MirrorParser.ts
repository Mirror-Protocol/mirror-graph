import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { Container } from 'typedi'
import { ContractEntity } from 'orm'
import { GovService, AssetService, OraclePriceService } from 'services'

export class MirrorParser {
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

  get assetService(): AssetService {
    return Container.get(AssetService)
  }

  get oraclePriceService(): OraclePriceService {
    return Container.get(OraclePriceService)
  }
}
