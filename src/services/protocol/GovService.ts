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
    return getManager().transaction(async (manager: EntityManager) => {
      const gov = new GovEntity({
        codeIds,
        owner: wallet.key.accAddress,
        chainId: config.TERRA_CHAIN_ID,
      })

      const asset = new AssetEntity({
        symbol: config.MIRROR_TOKEN_SYMBOL,
        name: config.MIRROR_TOKEN_NAME,
        gov,
      })

      // create factory contract
      const factory = await this.contractService.createFactory(wallet, gov)

      // create mirror token contract
      const mirrorToken = await this.contractService.createToken(
        wallet,
        gov,
        asset,
        ContractType.MIRROR_TOKEN,
        config.MIRROR_TOKEN_SYMBOL,
        config.MIRROR_TOKEN_NAME,
        factory.address
      )

      // create gov contract
      const govContract = await this.contractService.createGov(wallet, gov, mirrorToken.address)

      // create collector contract
      const collector = await this.contractService.createCollector(
        wallet,
        gov,
        govContract.address,
        factory.address,
        mirrorToken.address
      )

      // create market/lpToken/staking
      const { market, lpToken, staking } = await this.contractService.createMarket(
        wallet,
        gov,
        asset,
        config.MIRROR_TOKEN_SYMBOL,
        mirrorToken.address,
        mirrorToken.address,
        collector.address
      )

      // set mirror token to factory
      await wallet.execute(factory.address, {
        PostInitialize: { mirrorToken: mirrorToken.address },
      })

      // save to db
      await manager.save([
        gov,
        asset,
        factory,
        mirrorToken,
        govContract,
        collector,
        market,
        lpToken,
        staking,
      ])

      logger.info(`whitelisted asset ${config.MIRROR_TOKEN_SYMBOL}`)

      return gov
    })
  }

  async whitelisting(symbol: string, name: string, wallet: TxWallet): Promise<AssetEntity> {
    return getManager().transaction(async (manager: EntityManager) => {
      const gov = this.get()

      logger.info('whitelisting', symbol, name)

      if (await manager.getRepository(AssetEntity).findOne({ symbol, gov })) {
        throw new Error('already registered symbol asset')
      }

      // save asset entity of mirror token
      const asset = new AssetEntity({ symbol, name, gov })

      const contract = this.contractService

      const mint = await contract.createMint(wallet, gov, asset)
      const token = await contract.createToken(
        wallet,
        gov,
        asset,
        ContractType.TOKEN,
        symbol,
        name,
        mint.address
      )
      const mirrorToken = await contract.get({ gov, type: ContractType.MIRROR_TOKEN })
      const oracle = await contract.createOracle(
        wallet,
        gov,
        asset,
        token.address,
        symbol,
        config.COLLATERAL_SYMBOL
      )
      const { market, lpToken, staking } = await contract.createMarket(
        wallet,
        gov,
        asset,
        symbol,
        token.address,
        mirrorToken.address,
        oracle.address
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

      // save to db
      await manager.save([asset, mint, token, oracle, market, lpToken, staking])

      return asset
    })
  }

  async save(gov: GovEntity): Promise<GovEntity> {
    this.gov = await this.govRepo.save(gov)
    return gov
  }
}
