import { TxInfo, TxLog, MsgExecuteContract } from '@terra-money/terra.js'
import { EntityManager } from 'typeorm'
import { Container } from 'typedi'
import { ContractEntity } from 'orm'
import {
  GovService,
  ContractService,
  AssetService,
  OracleService,
  PriceService,
} from 'services'

export class MirrorParser {
  // return: entities to save
  public async parse(
    manager: EntityManager, txInfo: TxInfo, msg: MsgExecuteContract, msgIndex: number, log: TxLog, contract: ContractEntity
  ): Promise<boolean> {
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

  get oracleService(): OracleService {
    return Container.get(OracleService)
  }

  get priceService(): PriceService {
    return Container.get(PriceService)
  }
}
