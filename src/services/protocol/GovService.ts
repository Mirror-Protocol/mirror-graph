import { Repository, FindConditions, getManager, EntityManager } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Service, Inject } from 'typedi'
import { ContractService } from 'services'
import { GovEntity, AssetEntity } from 'orm'
import { CodeIds, ContractType } from 'types'
import { TxWallet } from 'lib/terra'
import * as logger from 'lib/logger'
import config from 'config'

@Service()
export class GovService {
  private gov: GovEntity

  constructor(
    @InjectRepository(GovEntity) private readonly govRepo: Repository<GovEntity>,
    @InjectRepository(AssetEntity) private readonly assetRepo: Repository<AssetEntity>,
    @Inject((type) => ContractService) private readonly contractService: ContractService
  ) {}

  get(): GovEntity {
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

  async create(wallet: TxWallet, codeIds: CodeIds): Promise<GovEntity> {
    const gov = new GovEntity({
      codeIds,
      owner: wallet.key.accAddress,
      chainId: config.TERRA_CHAIN_ID,
      contracts: [],
    })

    // create factory contract
    const factory = await this.contractService.createFactory(wallet, gov)
    gov.contracts.push(factory)

    // create mirror token contract
    const mirrorToken = await this.contractService.createToken(
      wallet,
      gov,
      ContractType.MIRROR_TOKEN,
      config.MIRROR_TOKEN_SYMBOL,
      config.MIRROR_TOKEN_NAME,
      factory
    )
    gov.contracts.push(mirrorToken)

    // create gov contract
    gov.contracts.push(await this.contractService.createGov(wallet, gov))

    // create collector contract
    gov.contracts.push(await this.contractService.createCollector(wallet, gov))

    // create market/lpToken/staking
    const { market, lpToken, staking } = await this.contractService.createMarket(
      wallet,
      gov,
      config.MIRROR_TOKEN_SYMBOL,
      mirrorToken
    )
    gov.contracts.push(market, lpToken, staking)

    // set mirror token to factory
    await wallet.execute(factory.address, {
      PostInitialize: { mirrorToken: mirrorToken.address },
    })

    return getManager().transaction(async (manager: EntityManager) => {
      // save gov entity
      this.gov = await manager.save(gov)

      // save asset entity of mirror token
      await manager.save(
        new AssetEntity({
          symbol: config.MIRROR_TOKEN_SYMBOL,
          name: config.MIRROR_TOKEN_NAME,
          gov,
          contracts: [mirrorToken, lpToken, market, staking],
        })
      )

      logger.info(`whitelisted asset ${config.MIRROR_TOKEN_SYMBOL}`)

      return this.gov
    })
  }

  async whitelisting(symbol: string, name: string, wallet: TxWallet): Promise<AssetEntity> {
    const gov = this.get()

    logger.info('whitelisting', symbol, name)

    if (await this.assetRepo.findOne({ symbol, gov })) {
      throw new Error('already registered symbol asset')
    }

    const contract = this.contractService

    const mint = await contract.createMint(wallet, gov)
    const token = await contract.createToken(wallet, gov, ContractType.TOKEN, symbol, name, mint)
    const oracle = await contract.createOracle(wallet, gov, token, symbol, config.COLLATERAL_SYMBOL)
    const { market, lpToken, staking } = await contract.createMarket(
      wallet,
      gov,
      symbol,
      token,
      oracle
    )

    // set asset infomation to mint contract
    await wallet.execute(mint.address, {
      PostInitialize: {
        assetToken: token.address,
        assetOracle: oracle.address,
        assetSymbol: symbol,
      },
    })

    logger.info(`whitelisted asset ${symbol}`)

    // create asset entity
    return this.assetRepo.save({
      symbol,
      name,
      gov,
      contracts: [mint, token, lpToken, oracle, market, staking],
    })
  }

  async save(gov: GovEntity): Promise<GovEntity> {
    this.gov = await this.govRepo.save(gov)
    return gov
  }
}
