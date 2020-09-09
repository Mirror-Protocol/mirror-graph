import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository } from 'typeorm'
import { Service, Inject } from 'typedi'
import { Wallet } from '@terra-money/terra.js'
import { AssetEntity } from 'orm'
import { ContractService, AssetService } from 'services'
import { instantiate, execute } from 'lib/terra'
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

  async create(wallet: Wallet): Promise<void> {
    const contract = this.contractService.getContract()

    // create factory, collector contract
    const factory = await instantiate(contract.codeIds.factory, initMsgs.factory, wallet)
    const collector = await instantiate(
      contract.codeIds.collector,
      { ...initMsgs.collector, factoryContract: factory },
      wallet
    )

    // save
    await this.contractService.set({ factory, collector })

    // whitelisting mirror token and create gov contract
    const mirrorToken = await this.whitelisting(config.MIRROR_SYMBOL, 'Mirror Token', wallet)
    const gov = await instantiate(contract.codeIds.gov, { mirrorToken: mirrorToken.token }, wallet)

    // set mirror token to factory
    await execute(factory, { PostInitialize: { mirrorToken: mirrorToken.token } }, wallet)

    // save
    await this.contractService.set({ gov })
  }

  async whitelisting(
    symbol: string,
    name: string,
    ownerWallet: Wallet,
    oracleWallet?: Wallet
  ): Promise<AssetEntity> {
    logger.info('whitelisting', symbol, name)

    const asset = await this.assetService.get({ symbol }).catch(() => undefined)
    if (asset) {
      throw new Error('already registered symbol asset')
    }

    const contract = this.contractService.getContract()

    let ownerSequence = await ownerWallet.sequence()

    const mint =
      oracleWallet &&
      (await instantiate(contract.codeIds.mint, initMsgs.mint, ownerWallet, ownerSequence))
    ownerSequence += 1
    const minter = oracleWallet ? mint : contract.factory

    const token = await instantiate(
      contract.codeIds.token,
      { ...initMsgs.token, symbol, name, mint: { cap: '100000000000', minter } },
      ownerWallet,
      ownerSequence
    )
    ownerSequence += 1

    const oracle =
      oracleWallet &&
      (await instantiate(
        contract.codeIds.oracle,
        { assetToken: token, baseDenom: symbol, quoteDenom: 'uusd' },
        oracleWallet
      ))

    const market = await instantiate(
      contract.codeIds.market,
      {
        ...initMsgs.market,
        commissionCollector: contract.collector,
        assetToken: token,
        assetSymbol: symbol,
        assetOracle: oracle,
      },
      ownerWallet,
      ownerSequence
    )
    ownerSequence += 1

    const lpToken = await instantiate(
      contract.codeIds.token,
      {
        ...initMsgs.token,
        mint: { cap: '100000000000000', minter: market },
        symbol: `${symbol}-LP`,
        name: `${symbol}-UST LP`,
      },
      ownerWallet,
      ownerSequence
    )
    ownerSequence += 1

    const staking = await instantiate(
      contract.codeIds.staking,
      {
        mirrorToken:
          symbol !== config.MIRROR_SYMBOL
            ? (await this.assetService.get({ symbol: config.MIRROR_SYMBOL })).token
            : token,
        stakingToken: lpToken,
      },
      ownerWallet,
      ownerSequence
    )
    ownerSequence += 1

    // set asset infomation to mint contract
    oracleWallet &&
      (await execute(
        mint,
        {
          PostInitialize: { assetToken: token, assetOracle: oracle, assetSymbol: symbol },
        },
        ownerWallet
      ))

    // set liquidity token to market
    await execute(market, { PostInitialize: { liquidityToken: lpToken } }, ownerWallet)

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
