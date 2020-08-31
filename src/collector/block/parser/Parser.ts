import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { Container } from 'typedi'
import { ContractService, AssetService, PriceService } from 'services'

export class Parser {
  public async parse(
    entityManager: EntityManager,
    txInfo: TxInfo,
    msg: MsgExecuteContract,
    log: TxLog
  ): Promise<boolean> {
    throw new Error('must implement parse function')
  }

  get contractService(): ContractService {
    return Container.get(ContractService)
  }

  get assetService(): AssetService {
    return Container.get(AssetService)
  }

  get priceService(): PriceService {
    return Container.get(PriceService)
  }
}
