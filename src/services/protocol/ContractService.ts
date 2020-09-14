import { Repository, FindConditions } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Service } from 'typedi'
import initMsgs from 'contracts/initMsgs'
import { TxWallet } from 'lib/terra'
import { ContractEntity, GovEntity, AssetEntity } from 'orm'
import { ContractType } from 'types'
import config from 'config'

@Service()
export class ContractService {
  constructor(
    @InjectRepository(ContractEntity) private readonly contractRepo: Repository<ContractEntity>
  ) {}

  async get(conditions: FindConditions<ContractEntity>): Promise<ContractEntity> {
    if (!conditions.gov && !conditions.asset) {
      throw new Error('conditions must have gov or asset')
    }
    return this.contractRepo.findOne(conditions)
  }

  async create(
    wallet: TxWallet,
    gov: GovEntity,
    type: ContractType,
    codeId: number,
    initMsg: object,
    asset?: AssetEntity
  ): Promise<ContractEntity> {
    const address = await wallet.instantiate(codeId, initMsg)
    return new ContractEntity({ address, type, gov, asset })
  }

  async createFactory(wallet: TxWallet, gov: GovEntity): Promise<ContractEntity> {
    return this.create(wallet, gov, ContractType.FACTORY, gov.codeIds.factory, initMsgs.factory)
  }

  async createGov(wallet: TxWallet, gov: GovEntity, mirrorToken: string): Promise<ContractEntity> {
    return this.create(wallet, gov, ContractType.GOV, gov.codeIds.gov, {
      ...initMsgs.gov,
      mirrorToken,
    })
  }

  async createCollector(
    wallet: TxWallet,
    gov: GovEntity,
    govContract: string,
    factoryContract: string,
    mirrorToken: string
  ): Promise<ContractEntity> {
    return this.create(wallet, gov, ContractType.COLLECTOR, gov.codeIds.collector, {
      ...initMsgs.collector,
      govContract,
      factoryContract,
      mirrorToken,
    })
  }

  async createMint(wallet: TxWallet, gov: GovEntity, asset: AssetEntity): Promise<ContractEntity> {
    return this.create(wallet, gov, ContractType.MINT, gov.codeIds.mint, initMsgs.mint, asset)
  }

  async createOracle(
    wallet: TxWallet,
    gov: GovEntity,
    asset: AssetEntity,
    assetToken: string,
    baseDenom: string,
    quoteDenom: string
  ): Promise<ContractEntity> {
    return this.create(
      wallet,
      gov,
      ContractType.ORACLE,
      gov.codeIds.oracle,
      {
        assetToken,
        baseDenom,
        quoteDenom,
      },
      asset
    )
  }

  async createToken(
    wallet: TxWallet,
    gov: GovEntity,
    asset: AssetEntity,
    type: ContractType,
    symbol: string,
    name: string,
    minter: string
  ): Promise<ContractEntity> {
    const initMsg = {
      ...initMsgs.token,
      symbol,
      name,
      mint: { cap: '100000000000', minter },
    }
    return this.create(wallet, gov, type, gov.codeIds.token, initMsg, asset)
  }

  async createMarket(
    wallet: TxWallet,
    gov: GovEntity,
    asset: AssetEntity,
    symbol: string,
    token: string,
    mirrorToken: string,
    collector: string,
    oracle?: string
  ): Promise<{ market: ContractEntity; lpToken: ContractEntity; staking: ContractEntity }> {
    const market = await this.create(
      wallet,
      gov,
      ContractType.MARKET,
      gov.codeIds.market,
      {
        ...initMsgs.market,
        commissionCollector: collector,
        assetSymbol: symbol,
        assetToken: token,
        assetOracle: oracle,
      },
      asset
    )

    const lpToken = await this.create(
      wallet,
      gov,
      ContractType.LP_TOKEN,
      gov.codeIds.token,
      {
        ...initMsgs.token,
        symbol: `${symbol}-LP`,
        name: `${symbol}-${config.COLLATERAL_SYMBOL} LP`,
        mint: { cap: '100000000000', minter: market.address },
      },
      asset
    )

    const staking = await this.create(
      wallet,
      gov,
      ContractType.STAKING,
      gov.codeIds.staking,
      {
        mirrorToken,
        stakingToken: lpToken.address,
      },
      asset
    )

    // set liquidity token to market
    await wallet.execute(market.address, { PostInitialize: { liquidityToken: lpToken.address } })

    return { market, lpToken, staking }
  }
}
