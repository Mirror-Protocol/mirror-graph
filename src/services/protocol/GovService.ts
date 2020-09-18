import { Repository, FindConditions, getManager, EntityManager } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { TxInfo } from '@terra-money/terra.js'
import { Service, Inject } from 'typedi'
import { ContractService } from 'services'
import { GovEntity, AssetEntity } from 'orm'
import { CodeIds, ContractType } from 'types'
import { TxWallet } from 'lib/terra'
import * as logger from 'lib/logger'
import initMsgs from 'contracts/initMsgs'
import config from 'config'

@Service()
export class GovService {
  private gov: GovEntity

  constructor(
    @InjectRepository(GovEntity) private readonly govRepo: Repository<GovEntity>,
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
      const { TERRA_CHAIN_ID: chainId, MIRROR_TOKEN_SYMBOL, MIRROR_TOKEN_NAME } = config
      const service = this.contractService
      const owner = wallet.key.accAddress

      // create gov entity
      const gov = new GovEntity({ codeIds, owner, chainId })

      // create mirror token entity
      const mirrorAsset = new AssetEntity({ symbol: MIRROR_TOKEN_SYMBOL, name: MIRROR_TOKEN_NAME, gov })

      // create factory contract
      const factory = await service.createFactory(wallet, gov)

      // create mirror token contract
      const mirrorToken = await service.createToken(
        wallet, gov, mirrorAsset, MIRROR_TOKEN_SYMBOL, MIRROR_TOKEN_NAME, factory.address
      )
      gov.mirrorToken = mirrorToken.address

      // create gov contract
      const govContract = await service.createGov(wallet, gov, mirrorToken.address)

      // create oracle contract
      const oracle = await service.createOracle(wallet, gov, factory.address)

      // create mint contract
      const mint = await service.createMint(wallet, gov, factory.address, oracle.address)

      // create staking contract
      const staking = await service.createStaking(wallet, gov, factory.address, mirrorToken.address)

      // create collector contract
      const collector = await service.createCollector(
        wallet, gov, govContract.address, factory.address, mirrorToken.address
      )

      // create uniswap factory contract
      const tokenFactory = await service.createTokenFactory(wallet, gov)

      // create mirror token pair
      const pairEntities = await service.createMirrorPair(
        wallet, gov, mirrorAsset, govContract.address, collector.address, tokenFactory.address, mirrorToken.address
      )

      // factory post initialize
      await wallet.execute(factory.address, { PostInitialize: {
        owner: wallet.key.accAddress,
        uniswapFactory: tokenFactory.address,
        mirrorToken: mirrorToken.address,
        stakingContract: staking.address,
        oracleContract: oracle.address,
        mintContract: mint.address,
        commissionCollector: collector.address
      } })

      // factory contract: whitelist mirror token
      await wallet.execute(factory.address, { uniswapCreationHook: { assetToken: mirrorToken.address } })

      // factory contract: update owner to gov
      // await wallet.execute(factory.address, { updateConfig: { owner: govContract.address } })

      // save to db
      await manager.save([
        gov,
        mirrorAsset,
        factory,
        mirrorToken,
        govContract,
        oracle,
        mint,
        staking,
        collector,
        tokenFactory,
        ...pairEntities
      ])

      return gov
    })
  }

  async whitelisting(wallet: TxWallet, symbol: string, name: string): Promise<TxInfo> {
    const gov = this.gov
    const oracle = await this.contractService.get({ gov, type: ContractType.ORACLE })
    const factory = await this.contractService.get({ gov, type: ContractType.FACTORY })
    if (!gov || !oracle || !factory) {
      throw new Error('whitelisting is not ready')
    }

    return wallet.execute(factory.address, {
      whitelist: { ...initMsgs.whitelist, symbol, name, oracleFeeder: oracle.address }
    })
  }

  async save(gov: GovEntity): Promise<GovEntity> {
    this.gov = await this.govRepo.save(gov)
    return gov
  }
}
