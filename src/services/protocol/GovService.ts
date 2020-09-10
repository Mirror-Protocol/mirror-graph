import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository } from 'typeorm'
import { Service, Inject } from 'typedi'
import { AssetEntity } from 'orm'
import { ContractService, AssetService } from 'services'
import { TxWallet } from 'lib/terra'
import * as logger from 'lib/logger'
import initMsgs from 'contracts/initMsgs'
import config from 'config'

@Service()
export class GovService {
  constructor(
    @InjectRepository(AssetEntity) private readonly assetRepo: Repository<AssetEntity>,
    @Inject((type) => ContractService) private readonly contractService: ContractService,
    @Inject((type) => AssetService) private readonly assetService: AssetService
  ) {}

  async create(wallet: TxWallet): Promise<void> {
    const contract = this.contractService.getContract()

    // create factory, collector contract
    const factory = await wallet.instantiate(contract.codeIds.factory, initMsgs.factory)
    const collector = await wallet.instantiate(contract.codeIds.collector, {
      ...initMsgs.collector,
      factoryContract: factory,
    })

    // save
    await this.contractService.set({ factory, collector })

    // whitelisting mirror token and create gov contract
    const mirrorToken = await this.whitelisting(config.MIRROR_SYMBOL, 'Mirror Token', wallet)
    const gov = await wallet.instantiate(contract.codeIds.gov, { mirrorToken: mirrorToken.token })

    // set mirror token to factory
    await wallet.execute(factory, { PostInitialize: { mirrorToken: mirrorToken.token } })

    // save
    await this.contractService.set({ gov })
  }

  async whitelisting(
    symbol: string,
    name: string,
    ownerWallet: TxWallet,
    oracleWallet?: TxWallet
  ): Promise<AssetEntity> {
    logger.info('whitelisting', symbol, name)

    const asset = await this.assetService.get({ symbol }).catch(() => undefined)
    if (asset) {
      throw new Error('already registered symbol asset')
    }

    const contract = this.contractService.getContract()

    const mint =
      oracleWallet && (await oracleWallet.instantiate(contract.codeIds.mint, initMsgs.mint))
    const minter = oracleWallet ? mint : contract.factory

    const token = await ownerWallet.instantiate(contract.codeIds.token, {
      ...initMsgs.token,
      symbol,
      name,
      mint: { cap: '100000000000', minter },
    })

    const oracle =
      oracleWallet &&
      (await oracleWallet.instantiate(contract.codeIds.oracle, {
        assetToken: token,
        baseDenom: symbol,
        quoteDenom: 'uusd',
      }))

    const market = await ownerWallet.instantiate(contract.codeIds.market, {
      ...initMsgs.market,
      commissionCollector: contract.collector,
      assetToken: token,
      assetSymbol: symbol,
      assetOracle: oracle,
    })

    const lpToken = await ownerWallet.instantiate(contract.codeIds.token, {
      ...initMsgs.token,
      mint: { cap: '100000000000000', minter: market },
      symbol: `${symbol}-LP`,
      name: `${symbol}-UST LP`,
    })

    const staking = await ownerWallet.instantiate(contract.codeIds.staking, {
      mirrorToken:
        symbol !== config.MIRROR_SYMBOL
          ? (await this.assetService.get({ symbol: config.MIRROR_SYMBOL })).token
          : token,
      stakingToken: lpToken,
    })

    // set asset infomation to mint contract
    oracleWallet &&
      (await oracleWallet.execute(mint, {
        PostInitialize: { assetToken: token, assetOracle: oracle, assetSymbol: symbol },
      }))

    // set liquidity token to market
    await ownerWallet.execute(market, { PostInitialize: { liquidityToken: lpToken } })

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
      contract,
    })
  }
}
