import * as fs from 'fs'
import * as bluebird from 'bluebird'
import { Repository, FindConditions, getManager, EntityManager } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { TxInfo } from '@terra-money/terra.js'
import { Service, Inject } from 'typedi'
import { ContractService } from 'services'
import { GovEntity, AssetEntity, ContractEntity } from 'orm'
import { CodeIds, ContractType } from 'types'
import { TxWallet, findAttributes, findAttribute } from 'lib/terra'
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

  async create(wallet: TxWallet, oracleWallet: TxWallet, codeIds: CodeIds, whitelist: { [symbol: string]: string }): Promise<GovEntity> {
    return getManager().transaction(async (manager: EntityManager) => {
      const { TERRA_CHAIN_ID: chainId, MIRROR_TOKEN_SYMBOL, MIRROR_TOKEN_NAME } = config
      const service = this.contractService
      const owner = wallet.key.accAddress

      // create gov entity
      const govEntity = new GovEntity({ codeIds, owner, chainId })

      // create mirror token entity
      const mirrorAssetEntity = new AssetEntity({ symbol: MIRROR_TOKEN_SYMBOL, name: MIRROR_TOKEN_NAME, gov: govEntity })

      // create factory contract
      const factoryContract = await service.createFactory(wallet, govEntity)
      govEntity.factory = factoryContract.address

      // create mirror token contract
      const mirrorToken = await service.createToken(
        wallet, govEntity, mirrorAssetEntity, MIRROR_TOKEN_SYMBOL, MIRROR_TOKEN_NAME, govEntity.factory
      )
      govEntity.mirrorToken = mirrorToken.address
      mirrorAssetEntity.address = mirrorToken.address

      // create gov contract
      const govContract = await service.createGov(wallet, govEntity)
      govEntity.address = govContract.address

      // create oracle contract
      const oracle = await service.createOracle(wallet, govEntity)
      govEntity.oracle = oracle.address

      // create mint contract
      const mint = await service.createMint(wallet, govEntity)
      govEntity.mint = mint.address

      // create staking contract
      const staking = await service.createStaking(wallet, govEntity)
      govEntity.staking = staking.address

      // create uniswap factory contract
      const tokenFactory = await service.createTokenFactory(wallet, govEntity)
      govEntity.tokenFactory = tokenFactory.address

      // create collector contract
      const collector = await service.createCollector(wallet, govEntity)
      govEntity.collector = collector.address

      // create mirror token pair
      const pairEntities = await service.createMirrorPair(wallet, govEntity, mirrorAssetEntity)

      // factory post initialize
      await wallet.execute(factoryContract.address, { PostInitialize: {
        owner: wallet.key.accAddress,
        uniswapFactory: tokenFactory.address,
        mirrorToken: mirrorToken.address,
        stakingContract: staking.address,
        oracleContract: oracle.address,
        mintContract: mint.address,
        commissionCollector: collector.address
      } })

      // factory contract: whitelist mirror token
      await wallet.execute(factoryContract.address, { uniswapCreationHook: { assetToken: mirrorToken.address } })

      const oracleFeeder = oracleWallet.key.accAddress
      const assets = {
        [mirrorToken.address]: {
          pair: pairEntities.find(pair => pair.type === ContractType.PAIR).address,
          lpToken: pairEntities.find(pair => pair.type === ContractType.LP_TOKEN).address,
        }
      }
      const oracleInfo = {
        oracle: govEntity.oracle,
        assets: {}
      }
      // whitelisting assets
      const assetEntities = []
      await bluebird.mapSeries(Object.keys(whitelist), async (symbol) => {
        logger.info(`whitelisting ${symbol}`)

        const tx = await wallet.execute(govEntity.factory, {
          whitelist: { ...initMsgs.whitelist, symbol, name: whitelist[symbol], oracleFeeder }
        })

        const attributes = findAttributes(tx.logs[0].events, 'from_contract')
        const address = findAttribute(attributes, 'asset_token')
        const pair = findAttribute(attributes, 'pair_contract_addr')
        const lpToken = findAttribute(attributes, 'liquidity_token_addr')

        assets[address] = { pair, lpToken }
        oracleInfo.assets[symbol.substring(1)] = address


        const asset = new AssetEntity({
          gov: govEntity, symbol, name: whitelist[symbol], address, pair, lpToken
        })
        const tokenEntity = new ContractEntity({ address, type: ContractType.TOKEN, gov: govEntity, asset })
        const pairEntity = new ContractEntity({ address: pair, type: ContractType.PAIR, gov: govEntity, asset })
        const lpTokenEntity = new ContractEntity({ address: lpToken, type: ContractType.LP_TOKEN, gov: govEntity, asset })
        assetEntities.push(asset, tokenEntity, pairEntity, lpTokenEntity)
      })

      const contracts = {
        gov: govEntity.address,
        mirrorToken: govEntity.mirrorToken,
        factory: govEntity.factory,
        oracle: govEntity.oracle,
        mint: govEntity.mint,
        staking: govEntity.staking,
        tokenFactory: govEntity.tokenFactory,
        collector: govEntity.collector,
      }
      // save contracts.json
      fs.writeFileSync('./data/contracts.json', JSON.stringify(contracts))
      // save assets.json
      fs.writeFileSync('./data/assets.json', JSON.stringify(assets))
      // save address.json for oracle
      fs.writeFileSync('./data/address.json', JSON.stringify(oracleInfo))

      // factory contract: update owner to gov
      // await wallet.execute(factory.address, { updateConfig: { owner: govContract.address } })

      // save to db
      await manager.save([
        govEntity,
        mirrorAssetEntity,
        factoryContract,
        mirrorToken,
        govContract,
        oracle,
        mint,
        staking,
        collector,
        tokenFactory,
        ...pairEntities,
        ...assetEntities,
      ])

      return govEntity
    })
  }

  async whitelisting(wallet: TxWallet, oracleWallet: TxWallet, symbol: string, name: string): Promise<TxInfo> {
    return wallet.execute(this.gov.factory, {
      whitelist: { ...initMsgs.whitelist, symbol, name, oracleFeeder: oracleWallet.key.accAddress }
    })
  }

  async save(gov: GovEntity): Promise<GovEntity> {
    this.gov = await this.govRepo.save(gov)
    return gov
  }
}
