import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository, FindConditions } from 'typeorm'
import { Service, Inject } from 'typedi'
import { Key, Coin, Coins, TxInfo } from '@terra-money/terra.js'
import { AssetEntity, OraclePrice, MintWhitelist, AmountResponse } from 'orm'
import { ContractService } from 'services'
import { instantiate, contractQuery, execute } from 'lib/terra'
import * as logger from 'lib/logger'

@Service()
export class AssetService {
  constructor(
    @InjectRepository(AssetEntity) private readonly assetRepo: Repository<AssetEntity>,
    @Inject((type) => ContractService) private readonly contractService: ContractService
  ) {}

  async get(conditions: FindConditions<AssetEntity>): Promise<AssetEntity> {
    const contract = conditions.contract || this.contractService.getContract()
    return this.assetRepo.findOne({ ...conditions, contract })
  }

  async getAll(): Promise<AssetEntity[]> {
    const contract = this.contractService.getContract()
    return this.assetRepo.find({ contract })
  }

  async whitelisting(
    symbol: string,
    name: string,
    ownerKey: Key,
    oracleKey: Key
  ): Promise<AssetEntity> {
    if (await this.get({ symbol })) {
      throw new Error('already registered symbol asset')
    }

    const contract = this.contractService.getContract()

    const token = await instantiate(
      contract.codeIds.token,
      { minter: contract.mint, symbol, name, decimals: 6, initialBalances: [] },
      ownerKey
    )

    const oracle = await instantiate(
      contract.codeIds.oracle,
      { assetToken: token, baseDenom: symbol, quoteDenom: 'uusd' },
      oracleKey
    )

    // execute mint.whitelist function for whitelist
    await execute(contract.mint, { whitelist: { assetToken: token, oracle, symbol } }, ownerKey)

    logger.info(`whitelisted asset ${symbol}`)

    // save asset entity to database
    return this.assetRepo.save({ symbol, name, token, oracle, contract })
  }

  // deposit uluna for mint
  async deposit(symbol: string, coin: Coin, key: Key): Promise<TxInfo> {
    const contract = this.contractService.getContract()
    return execute(contract.mint, { deposit: { symbol } }, key, new Coins([coin]))
  }

  // approve token transfer
  async approve(coin: Coin, spender: string, key: Key): Promise<TxInfo> {
    const asset = await this.get({ symbol: coin.denom })
    return execute(asset.token, { approve: { amount: coin.amount.toString(), spender } }, key)
  }

  async getWhitelist(symbol: string): Promise<MintWhitelist> {
    const contract = this.contractService.getContract()
    return contractQuery(contract.mint, { whitelist: { symbol } })
  }

  async getDepositAmount(symbol: string, address: string): Promise<string> {
    const contract = this.contractService.getContract()
    const { amount } = await contractQuery<AmountResponse>(contract.mint, {
      deposit: { symbol, address },
    })
    return amount
  }

  async getPrice(symbol: string): Promise<OraclePrice> {
    const asset = await this.get({ symbol })
    return contractQuery<OraclePrice>(asset.oracle, { price: {} })
  }

  async getBalance(symbol: string, address: string): Promise<string> {
    const asset = await this.get({ symbol })
    const { balance } = await contractQuery<{ balance: string }>(asset.token, {
      balance: { address },
    })

    return balance
  }
}
