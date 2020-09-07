import * as Bluebird from 'bluebird'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository, FindConditions } from 'typeorm'
import { Service, Inject } from 'typedi'
import { Key, Coin, TxInfo } from '@terra-money/terra.js'
import { AssetEntity } from 'orm'
import { ContractService, PriceService } from 'services'
import { ListedAsset, AssetHistory } from 'types'
import { contractQuery, execute } from 'lib/terra'

@Service()
export class AssetService {
  constructor(
    @InjectRepository(AssetEntity) private readonly assetRepo: Repository<AssetEntity>,
    @Inject((type) => ContractService) private readonly contractService: ContractService,
    @Inject((type) => PriceService) private readonly priceService: PriceService
  ) {}

  async get(conditions: FindConditions<AssetEntity>): Promise<AssetEntity> {
    const contract = conditions.contract || this.contractService.getContract()
    return this.assetRepo.findOne({ ...conditions, contract })
  }

  async getAll(): Promise<AssetEntity[]> {
    const contract = this.contractService.getContract()
    return this.assetRepo.find({ contract })
  }

  // approve token transfer
  async approve(coin: Coin, spender: string, key: Key): Promise<TxInfo> {
    const asset = await this.get({ symbol: coin.denom })
    return execute(asset.token, { approve: { amount: coin.amount.toString(), spender } }, key)
  }

  async getBalance(symbol: string, address: string): Promise<string> {
    const asset = await this.get({ symbol })
    const { balance } = await contractQuery<{ balance: string }>(asset.token, {
      balance: { address },
    })

    return balance
  }

  async getListedAssets(): Promise<ListedAsset[]> {
    return Bluebird.map(
      this.getAll(),
      async (asset) =>
        new ListedAsset(
          Object.assign(asset, {
            price: (await this.priceService.getLatestPrice(asset)).close,
          })
        )
    )
  }

  async getHistory(symbol: string): Promise<AssetHistory> {
    // const asset = await this.get({ symbol })

    return new AssetHistory()
  }
}
