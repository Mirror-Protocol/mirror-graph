import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository } from 'typeorm'
import { Service, Inject } from 'typedi'
import { Key } from '@terra-money/terra.js'
import { Asset } from 'orm'
import { OwnerService } from 'services'
import { instantiate, contractInfo } from 'lib/terra'
import * as logger from 'lib/logger'

@Service()
export class AssetService {
  constructor(
    @InjectRepository(Asset) private readonly assetRepo: Repository<Asset>,
    @Inject((type) => OwnerService) private readonly contractService: OwnerService
  ) {}

  async get(symbol: string): Promise<Asset> {
    return this.assetRepo.findOne({ symbol })
  }

  async getAll(): Promise<Asset[]> {
    return this.assetRepo.find()
  }

  async whitelisting(symbol: string, name: string, key: Key): Promise<Asset> {
    if (await this.get(symbol)) {
      throw new Error('already registered symbol asset')
    }
    console.log(symbol, name)
    const contract = await this.contractService.get()

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
    logger.info(`${symbol} asset created`)

    return this.assetRepo.save({
      symbol,
      name,
      token,
      oracle,
      contract,
    })
  }
}
