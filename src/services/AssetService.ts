import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository } from 'typeorm'
import { Service, Inject } from 'typedi'
import { Key, Coin, TxInfo } from '@terra-money/terra.js'
import { Asset, OraclePrice } from 'orm'
import { ContractService } from 'services'
import { contractQuery, execute } from 'lib/terra'

@Service()
export class AssetService {
  constructor(
    @InjectRepository(Asset) private readonly assetRepo: Repository<Asset>,
    @Inject((type) => ContractService) private readonly contractService: ContractService
  ) {}

  async get(symbol: string): Promise<Asset> {
    const contract = this.contractService.getContract()
    return this.assetRepo.findOne({ symbol, contract })
  }

  async getAll(): Promise<Asset[]> {
    const contract = this.contractService.getContract()
    return this.assetRepo.find({ contract })
  }

  async create(options: Partial<Asset>): Promise<Asset> {
    return this.assetRepo.save(options)
  }

  // approve token transfer
  async approve(coin: Coin, spender: string, key: Key): Promise<TxInfo> {
    const asset = await this.get(coin.denom)
    return execute(asset.token, { approve: { amount: coin.amount.toString(), spender } }, key)
  }

  async getPrice(symbol: string): Promise<OraclePrice> {
    const asset = await this.get(symbol)
    return contractQuery<OraclePrice>(asset.oracle, { price: {} })
  }

  async getBalance(symbol: string, address: string): Promise<string> {
    const asset = await this.get(symbol)
    const { balance } = await contractQuery<{ balance: string }>(asset.token, {
      balance: { address },
    })

    return balance
  }
}
