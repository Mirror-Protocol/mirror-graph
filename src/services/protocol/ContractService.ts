import { Repository, FindConditions, FindOneOptions, FindManyOptions } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Service } from 'typedi'
import initMsgs from 'contracts/initMsgs'
import { TxWallet, findAttributes, findAttribute } from 'lib/terra'
import { ContractEntity, GovEntity, AssetEntity } from 'orm'
import { ContractType } from 'types'
import config from 'config'

@Service()
export class ContractService {
  constructor(
    @InjectRepository(ContractEntity) private readonly contractRepo: Repository<ContractEntity>
  ) {}

  async get(conditions: FindConditions<ContractEntity>, options?: FindOneOptions<ContractEntity>): Promise<ContractEntity> {
    if (!conditions.gov && !conditions.asset && !conditions.address) {
      throw new Error('conditions must have gov or asset')
    }
    return this.contractRepo.findOne(conditions, options)
  }

  async find(options?: FindManyOptions<ContractEntity>): Promise<ContractEntity[]> {
    return this.contractRepo.find(options)
  }

  async create(
    wallet: TxWallet, gov: GovEntity, type: ContractType, codeId: number, initMsg: object, asset?: AssetEntity
  ): Promise<ContractEntity> {
    const address = await wallet.instantiate(codeId, initMsg)
    return new ContractEntity({ address, type, gov, asset })
  }

  async createFactory(wallet: TxWallet, gov: GovEntity): Promise<ContractEntity> {
    return this.create(wallet, gov, ContractType.FACTORY, gov.codeIds.factory, {
      ...initMsgs.factory, tokenCodeId: gov.codeIds.token
    })
  }

  async createGov(wallet: TxWallet, gov: GovEntity, mirrorToken: string): Promise<ContractEntity> {
    return this.create(wallet, gov, ContractType.GOV, gov.codeIds.gov, {
      ...initMsgs.gov, mirrorToken
    })
  }

  async createOracle(
    wallet: TxWallet, gov: GovEntity, owner: string
  ): Promise<ContractEntity> {
    return this.create(
      wallet, gov, ContractType.ORACLE, gov.codeIds.oracle, { ...initMsgs.oracle, owner }
    )
  }

  async createMint(wallet: TxWallet, gov: GovEntity, owner: string, oracle: string): Promise<ContractEntity> {
    return this.create(wallet, gov, ContractType.MINT, gov.codeIds.mint, {
      ...initMsgs.mint, owner, oracle, tokenCodeId: gov.codeIds.token
    })
  }

  async createStaking(wallet: TxWallet, gov: GovEntity, owner: string, mirrorToken: string): Promise<ContractEntity> {
    return this.create(wallet, gov, ContractType.STAKING, gov.codeIds.staking, {
      ...initMsgs.staking, owner, mirrorToken
    })
  }

  async createCollector(
    wallet: TxWallet, gov: GovEntity, govContract: string, factoryContract: string, mirrorToken: string
  ): Promise<ContractEntity> {
    return this.create(wallet, gov, ContractType.COLLECTOR, gov.codeIds.collector, {
      ...initMsgs.collector, govContract, factoryContract, mirrorToken
    })
  }

  async createTokenFactory(wallet: TxWallet, gov: GovEntity): Promise<ContractEntity> {
    return this.create(wallet, gov, ContractType.TOKEN_FACTORY, gov.codeIds.tokenFactory, {
      ...initMsgs.tokenFactory, pairCodeId: gov.codeIds.pair, tokenCodeId: gov.codeIds.token
    })
  }

  async createToken(
    wallet: TxWallet, gov: GovEntity, asset: AssetEntity, symbol: string, name: string, minter: string
  ): Promise<ContractEntity> {
    const initMsg = { ...initMsgs.token, symbol, name, mint: { minter } }

    return this.create(wallet, gov, ContractType.TOKEN, gov.codeIds.token, initMsg, asset)
  }

  async createMirrorPair(
    wallet: TxWallet, gov: GovEntity, asset: AssetEntity, govContract: string, collector: string, tokenFactory: string, mirrorToken: string
  ): Promise<ContractEntity[]> {
    const { NATIVE_TOKEN_SYMBOL, ACTIVE_COMMISSION, PASSIVE_COMMISSION } = config

    const txInfo = await wallet.execute(tokenFactory, { createPair: {
      pairOwner: govContract,
      commissionCollector: collector,
      activeCommission: ACTIVE_COMMISSION,
      passiveCommission: PASSIVE_COMMISSION,
      assetInfos: [
        { nativeToken: { denom: NATIVE_TOKEN_SYMBOL } },
        { token: { contractAddr: mirrorToken } }
      ]
    } })

    const attributes = findAttributes(txInfo.logs[0].events, 'from_contract')
    const pairContract = findAttribute(attributes, 'pair_contract_addr')
    const lpTokenContract = findAttribute(attributes, 'liquidity_token_addr')
    if (!pairContract || !lpTokenContract) {
      throw new Error(`create pair failed. lpToken(${lpTokenContract}), pair(${pairContract})`)
    }

    return [
      new ContractEntity({ address: pairContract, type: ContractType.PAIR, gov, asset }),
      new ContractEntity({ address: lpTokenContract, type: ContractType.LP_TOKEN, gov, asset }),
    ]
  }
}
