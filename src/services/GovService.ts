import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository } from 'typeorm'
import { Service, Inject } from 'typedi'
import { Key, Coin, Coins, TxInfo } from '@terra-money/terra.js'
import { AssetEntity } from 'orm'
import { MintWhitelist, AmountResponse } from 'types'
import { ContractService, AssetService } from 'services'
import { instantiate, contractQuery, execute } from 'lib/terra'
import * as logger from 'lib/logger'

@Service()
export class GovService {
  constructor(
    @InjectRepository(AssetEntity) private readonly assetRepo: Repository<AssetEntity>,
    @Inject((type) => ContractService) private readonly contractService: ContractService,
    @Inject((type) => AssetService) private readonly assetService: AssetService
  ) {}

  async whitelisting(
    symbol: string,
    name: string,
    ownerKey: Key,
    oracleKey: Key
  ): Promise<AssetEntity> {
    if (await this.assetService.get({ symbol })) {
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
}
