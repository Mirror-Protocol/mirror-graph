import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Service, Inject } from 'typedi'
import { ContractService } from 'services'
import { GovEntity, AssetEntity } from 'orm'
import { CodeIds } from 'types'
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

  async load(id: number): Promise<GovEntity> {
    const findOptions = id !== -1 ? { id } : { order: { createdAt: 'DESC' } }
    this.gov = await this.govRepo.findOne(findOptions)
    if (!this.gov) {
      logger.warn(`there is no gov contract. id: ${id}`)
    }

    return this.gov
  }

  async create(wallet: TxWallet, codeIds: CodeIds): Promise<GovEntity> {
    const govEntity = await this.govRepo.save({
      codeIds,
      owner: wallet.key.accAddress,
      chainId: config.TERRA_CHAIN_ID,
    })

    // create factory contract
    govEntity.factory = await this.contractService.createFactory(wallet, govEntity)

    // create mirror token contract
    govEntity.mirrorToken = await this.contractService.createToken(
      wallet,
      govEntity,
      config.MIRROR_TOKEN_SYMBOL,
      config.MIRROR_TOKEN_NAME,
      govEntity.factory
    )

    // create gov contract
    govEntity.gov = await this.contractService.createGov(wallet, govEntity)

    // create collector contract
    govEntity.collector = await this.contractService.createCollector(wallet, govEntity)

    // create market/lpToken/staking
    const { market, lpToken, staking } = await this.contractService.createMarket(
      wallet,
      govEntity,
      config.MIRROR_TOKEN_SYMBOL,
      govEntity.mirrorToken
    )

    // set mirror token to factory
    await wallet.execute(govEntity.factory.address, {
      PostInitialize: { mirrorToken: govEntity.mirrorToken.address },
    })

    // save mirror token
    await this.assetRepo.save({
      symbol: config.MIRROR_TOKEN_SYMBOL,
      name: config.MIRROR_TOKEN_NAME,
      token: govEntity.mirrorToken,
      lpToken,
      market,
      staking,
      gov: govEntity,
    })

    logger.info(`whitelisted asset ${config.MIRROR_TOKEN_SYMBOL}`)

    return this.govRepo.save(govEntity)
  }

  async whitelisting(symbol: string, name: string, wallet: TxWallet): Promise<AssetEntity> {
    const gov = this.get()

    logger.info('whitelisting', symbol, name)

    if (await this.assetRepo.findOne({ symbol, gov })) {
      throw new Error('already registered symbol asset')
    }

    const contract = this.contractService

    const mint = await contract.createMint(wallet, gov)
    const token = await contract.createToken(wallet, gov, symbol, name, mint)
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

    // save asset entity to database
    return this.assetRepo.save({ symbol, name, mint, token, lpToken, oracle, market, staking, gov })
  }

  async save(gov: GovEntity): Promise<GovEntity> {
    return this.govRepo.save(gov)
  }
}
