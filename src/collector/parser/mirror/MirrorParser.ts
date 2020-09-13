import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { Container } from 'typedi'
import { ContractEntity } from 'orm'
import { GovService, AssetService, OraclePriceService } from 'services'

export class MirrorParser {
  public async parse(
    manager: EntityManager,
    txInfo: TxInfo,
    msg: MsgExecuteContract,
    log: TxLog,
    contract: ContractEntity
  ): Promise<void> {
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
