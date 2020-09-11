import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository } from 'typeorm'
import { Service, Inject } from 'typedi'
import { AssetEntity } from 'orm'
import { GovService, AssetService } from 'services'
import { CodeIds } from 'types'
import { TxWallet } from 'lib/terra'
import * as logger from 'lib/logger'
import initMsgs from 'contracts/initMsgs'
import config from 'config'

@Service()
export class WhitelistingService {
  constructor(
    @InjectRepository(AssetEntity) private readonly assetRepo: Repository<AssetEntity>,
    @Inject((type) => GovService) private readonly govService: GovService,
    @Inject((type) => AssetService) private readonly assetService: AssetService
  ) {}

  async create(wallet: TxWallet, codeIds: CodeIds): Promise<void> {
    // create factory
    const factory = await wallet.instantiate(codeIds.factory, initMsgs.factory)

    // create mirror token
    const mirrorToken = await this.createToken(
      wallet,
      codeIds,
      config.MIRROR_TOKEN_SYMBOL,
      config.MIRROR_TOKEN_NAME,
      factory
    )

    // create gov/collector contract
    const gov = await wallet.instantiate(codeIds.gov, { mirrorToken })
    const collector = await wallet.instantiate(codeIds.collector, {
      ...initMsgs.collector,
      govContract: gov,
      factoryContract: factory,
      mirrorToken,
    })

    // create market/lpToken/staking
    const { market, lpToken, staking } = await this.createMarket(
      wallet,
      codeIds,
      config.MIRROR_TOKEN_SYMBOL,
      mirrorToken,
      mirrorToken,
      collector
    )

    // set mirror token to factory
    await wallet.execute(factory, { PostInitialize: { mirrorToken } })

    // save to contract
    const govEntity = await this.govService.set({ factory, gov, collector, mirrorToken })

    // save mirror token
    await this.assetRepo.save({
      symbol: config.MIRROR_TOKEN_SYMBOL,
      name: config.MIRROR_TOKEN_NAME,
      token: mirrorToken,
      lpToken,
      market,
      staking,
      gov: govEntity,
    })

    logger.info(`whitelisted asset ${config.MIRROR_TOKEN_SYMBOL}`)
  }

  async createToken(
    wallet: TxWallet,
    codeIds: CodeIds,
    symbol: string,
    name: string,
    minter: string
  ): Promise<string> {
    return wallet.instantiate(codeIds.token, {
      ...initMsgs.token,
      symbol,
      name,
      mint: { cap: '100000000000', minter },
    })
  }

  async createMarket(
    wallet: TxWallet,
    codeIds: CodeIds,
    symbol: string,
    token: string,
    mirrorToken: string,
    collector: string,
    oracle?: string
  ): Promise<{ market: string; lpToken: string; staking: string }> {
    const market = await wallet.instantiate(codeIds.market, {
      ...initMsgs.market,
      commissionCollector: collector,
      assetToken: token,
      assetSymbol: symbol,
      assetOracle: oracle,
    })

    const lpToken = await wallet.instantiate(codeIds.token, {
      ...initMsgs.token,
      mint: { cap: '100000000000000', minter: market },
      symbol: `${symbol}-LP`,
      name: `${symbol}-UST LP`,
    })

    const staking = await wallet.instantiate(codeIds.staking, {
      mirrorToken,
      stakingToken: lpToken,
    })

    // set liquidity token to market
    await wallet.execute(market, { PostInitialize: { liquidityToken: lpToken } })

    return { market, lpToken, staking }
  }

  async whitelisting(
    symbol: string,
    name: string,
    ownerWallet: TxWallet,
    oracleWallet: TxWallet
  ): Promise<AssetEntity> {
    logger.info('whitelisting', symbol, name)

    const asset = await this.assetService.get({ symbol }).catch(() => undefined)
    if (asset) {
      throw new Error('already registered symbol asset')
    }

    const gov = this.govService.getGov()
    const { codeIds } = gov

    // create mint contract
    const mint = await ownerWallet.instantiate(codeIds.mint, initMsgs.mint)
    // create token
    const token = await this.createToken(ownerWallet, codeIds, symbol, name, mint)
    // create oracle
    const oracle = await oracleWallet.instantiate(codeIds.oracle, {
      assetToken: token,
      baseDenom: symbol,
      quoteDenom: 'uusd',
    })
    // create market/lpToken/staking
    const { market, lpToken, staking } = await this.createMarket(
      ownerWallet,
      codeIds,
      symbol,
      token,
      gov.mirrorToken,
      gov.collector,
      oracle
    )

    // set asset infomation to mint contract
    await oracleWallet.execute(mint, {
      PostInitialize: { assetToken: token, assetOracle: oracle, assetSymbol: symbol },
    })

    logger.info(`whitelisted asset ${symbol}`)

    // save asset entity to database
    return this.assetRepo.save({
      symbol,
      name,
      mint,
      token,
      lpToken,
      oracle,
      market,
      staking,
      gov,
    })
  }
}
