import { Service, Inject } from 'typedi'
import { Key } from '@terra-money/terra.js'
import { Asset } from 'orm'
import { OwnerService, AssetService } from 'services'
import { instantiate, contractQuery, contractInfo, execute } from 'lib/terra'
import * as logger from 'lib/logger'

@Service()
export class MinterService {
  constructor(
    @Inject((type) => OwnerService) private readonly ownerService: OwnerService,
    @Inject((type) => AssetService) private readonly assetService: AssetService
  ) {}

  async config(
    options: {
      collateralDenom?: string
      depositDenom?: string
      whitelistThreshold?: string
      auctionDiscount?: string
      auctionThresholdRate?: string
      mintCapacity?: string
      owner?: string
    },
    key: Key
  ): Promise<void> {
    const contract = await this.ownerService.getContract()

    await execute(
      contract.mint,
      {
        updateConfig: options,
      },
      key
    )

    // logger.info('mint', await contractQuery(contract.mint, { whitelist: { symbol: 'mTEST' } }))
    logger.info(
      'mint',
      await contractQuery<{ config: object }>(contract.mint, { config: {} })
    )
  }

  async whitelist(symbol: string, name: string, key: Key): Promise<Asset> {
    if (await this.assetService.get(symbol)) {
      throw new Error('already registered symbol asset')
    }

    const contract = await this.ownerService.getContract()

    const token = await instantiate(
      contract.codeIds.token,
      {
        minter: contract.mint,
        symbol,
        name,
        decimals: 6,
        initialBalances: [],
      },
      key
    )

    const oracle = await instantiate(
      contract.codeIds.oracle,
      {
        assetToken: token,
        baseDenom: symbol,
        quoteDenom: 'uusd',
      },
      key
    )

    logger.info('token', await contractInfo(token))
    logger.info('oracle', await contractInfo(oracle))

    // execute whitelist function in mint contact
    await execute(contract.mint, { whitelist: { assetToken: token, oracle, symbol } }, key)

    // save asset entity to database
    const asset = await this.assetService.create({ symbol, name, token, oracle, contract })

    logger.info(`${symbol} asset created`)

    return asset
  }
}
