import { Repository, FindConditions, getManager, EntityManager } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Container, Service } from 'typedi'
import { GovEntity, ContractEntity, AssetEntity } from 'orm'
import { CodeIds, Contracts, Assets, ContractType } from 'types'
import { TxWallet } from 'lib/terra'
import * as logger from 'lib/logger'
import config from 'config'

@Service()
export class GovService {
  private gov: GovEntity

  constructor(
    @InjectRepository(GovEntity) private readonly govRepo: Repository<GovEntity>,
  ) {}

  get(): GovEntity {
    if (!this.gov) {
      throw new Error('gov not loaded')
    }
    return this.gov
  }

  async find(conditions: FindConditions<GovEntity>): Promise<GovEntity> {
    return this.govRepo.findOne(conditions)
  }

  async load(id: number): Promise<GovEntity> {
    const findOptions = id !== -1 ? { id } : { order: { createdAt: 'DESC' } }
    this.gov = await this.govRepo.findOne(findOptions)
    if (!this.gov) {
      logger.warn(`there is no gov contract. id: ${id}`)
    }

    return this.gov
  }

  async create(wallet: TxWallet, codeIds: CodeIds, contracts: Contracts, assets: Assets): Promise<GovEntity> {
    return getManager().transaction(async (manager: EntityManager) => {
      const { TERRA_CHAIN_ID: chainId } = config
      const owner = wallet.key.accAddress

      const {
        gov, mirrorToken, factory, oracle, mint, staking, tokenFactory, collector
      } = contracts

      const entities = []

      // create gov entity
      const govEntity = new GovEntity({
        codeIds, owner, chainId, gov, mirrorToken, factory, oracle, mint, staking, tokenFactory, collector
      })
      entities.push(govEntity)

      // create contract entities
      Object.keys(contracts)
        .filter((type) => type !== 'mirrorToken')
        .map((type) => {
          entities.push(
            new ContractEntity({ address: contracts[type], type: type as ContractType, gov: govEntity })
          )
        })

      // create mirror asset, contract entities
      const { symbol, name, token, pair, lpToken } = assets[mirrorToken]
      const asset = new AssetEntity({
        gov: govEntity, symbol, name, token, pair, lpToken
      })

      entities.push(
        asset,
        new AssetEntity({ gov: govEntity, symbol: 'uusd', name: 'uusd', token: 'uusd', pair: 'uusd', lpToken: 'uusd' }),
        new ContractEntity({ address: token, type: ContractType.TOKEN, gov: govEntity, asset }),
        new ContractEntity({ address: pair, type: ContractType.PAIR, gov: govEntity, asset }),
        new ContractEntity({ address: lpToken, type: ContractType.LP_TOKEN, gov: govEntity, asset })
      )

      // save to db
      await manager.save(entities)

      return govEntity
    })
  }
}

export function govService(): GovService {
  return Container.get(GovService)
}
