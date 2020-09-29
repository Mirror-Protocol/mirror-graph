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

  async createGov(wallet: TxWallet, gov: GovEntity): Promise<ContractEntity> {
    return this.create(wallet, gov, ContractType.GOV, gov.codeIds.gov, {
      ...initMsgs.gov, mirrorToken: gov.mirrorToken
    })
  }

  async createOracle(wallet: TxWallet, gov: GovEntity): Promise<ContractEntity> {
    return this.create(wallet, gov, ContractType.ORACLE, gov.codeIds.oracle, {
      ...initMsgs.oracle, owner: gov.factory
    })
  }

  async createMint(wallet: TxWallet, gov: GovEntity): Promise<ContractEntity> {
    const { factory: owner, oracle, codeIds } = gov

    return this.create(wallet, gov, ContractType.MINT, codeIds.mint, {
      ...initMsgs.mint, owner, oracle, tokenCodeId: codeIds.token
    })
  }

  async createStaking(wallet: TxWallet, gov: GovEntity): Promise<ContractEntity> {
    const { factory: owner, mirrorToken, codeIds } = gov

    return this.create(wallet, gov, ContractType.STAKING, codeIds.staking, {
      ...initMsgs.staking, owner, mirrorToken
    })
  }

  async createCollector(wallet: TxWallet, gov: GovEntity): Promise<ContractEntity> {
    const { tokenFactory: uniswapFactory, address: distributionContract, mirrorToken, codeIds } = gov

    return this.create(wallet, gov, ContractType.COLLECTOR, codeIds.collector, {
      ...initMsgs.collector, distributionContract, uniswapFactory, mirrorToken
    })
  }

  async createTokenFactory(wallet: TxWallet, gov: GovEntity): Promise<ContractEntity> {
    const { codeIds } = gov
    return this.create(wallet, gov, ContractType.TOKEN_FACTORY, codeIds.tokenFactory, {
      ...initMsgs.tokenFactory, pairCodeId: codeIds.pair, tokenCodeId: codeIds.token
    })
  }

  async createToken(
    wallet: TxWallet, gov: GovEntity, asset: AssetEntity, symbol: string, name: string, minter: string
  ): Promise<ContractEntity> {
    const initMsg = { ...initMsgs.token, symbol, name, mint: { minter } }

    return this.create(wallet, gov, ContractType.TOKEN, gov.codeIds.token, initMsg, asset)
  }

  async createMirrorPair(wallet: TxWallet, gov: GovEntity, asset: AssetEntity): Promise<ContractEntity[]> {
    const { NATIVE_TOKEN_SYMBOL, LP_COMMISSION, OWNER_COMMISSION } = config
    const {
      address: pairOwner, collector: commissionCollector, tokenFactory, mirrorToken
    } = gov

    const txInfo = await wallet.execute(tokenFactory, { createPair: {
      pairOwner,
      commissionCollector,
      lpCommission: LP_COMMISSION,
      ownerCommission: OWNER_COMMISSION,
      assetInfos: [
        { nativeToken: { denom: NATIVE_TOKEN_SYMBOL } },
        { token: { contractAddr: mirrorToken } }
      ]
    } })

    const attributes = findAttributes(txInfo.logs[0].events, 'from_contract')
    const pair = findAttribute(attributes, 'pair_contract_addr')
    const lpToken = findAttribute(attributes, 'liquidity_token_addr')
    if (!pair || !lpToken) {
      throw new Error(`create pair failed. lpToken(${lpToken}), pair(${pair})`)
    }
    asset.pair = pair
    asset.lpToken = lpToken

    return [
      new ContractEntity({ address: pair, type: ContractType.PAIR, gov, asset }),
      new ContractEntity({ address: lpToken, type: ContractType.LP_TOKEN, gov, asset }),
    ]
  }
}
