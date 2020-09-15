import { Resolver, Query, Arg, Root, FieldResolver } from 'type-graphql'
import { HistoryRanges, Asset, AssetOHLC, AssetHistory, ContractType } from 'types'
import { AssetService, ContractService, AccountService } from 'services'
import { AssetEntity } from 'orm'

@Resolver((of) => Asset)
export class AssetResolver {
  constructor(
    private readonly assetService: AssetService,
    private readonly contractService: ContractService,
    private readonly accountService: AccountService,
  ) {}

  async getContractAddress(asset: AssetEntity, type: ContractType): Promise<string> {
    return (await this.contractService.get({ asset, type }))?.address
  }

  @FieldResolver()
  async token(@Root() asset: AssetEntity): Promise<string> {
    return this.getContractAddress(asset, ContractType.TOKEN)
  }

  @FieldResolver()
  async mint(@Root() asset: AssetEntity): Promise<string> {
    return this.getContractAddress(asset, ContractType.MINT)
  }

  @FieldResolver()
  async market(@Root() asset: AssetEntity): Promise<string> {
    return this.getContractAddress(asset, ContractType.MARKET)
  }

  @FieldResolver()
  async lpToken(@Root() asset: AssetEntity): Promise<string> {
    return this.getContractAddress(asset, ContractType.LP_TOKEN)
  }

  @FieldResolver()
  async staking(@Root() asset: AssetEntity): Promise<string> {
    return this.getContractAddress(asset, ContractType.STAKING)
  }

  @FieldResolver()
  async price(@Root() asset: AssetEntity): Promise<string> {
    return this.assetService.getPrice(asset)
  }

  @FieldResolver()
  async oraclePrice(@Root() asset: AssetEntity): Promise<string> {
    return (await this.assetService.getOraclePrice(asset))?.price
  }

  @FieldResolver()
  async balance(@Root() asset: AssetEntity, @Arg('address') address: string): Promise<string> {
    return (await this.accountService.getAssetBalance(address, asset)).balance
  }
}

@Resolver()
export class AssetDataResolver {
  constructor(
    private readonly assetService: AssetService,
    private readonly accountService: AccountService,
  ) {}

  @Query((returns) => Asset, { description: 'Get asset' })
  async asset(@Arg('symbol') symbol: string): Promise<Asset> {
    return this.assetService.get({ symbol })
  }

  @Query((returns) => [Asset], { description: 'Get all listed assets' })
  async assets(): Promise<Asset[]> {
    return this.assetService.getAll()
  }

  @Query((returns) => AssetHistory, { description: 'Get asset price history' })
  async assetHistory(
    @Arg('symbol') symbol: string,
    @Arg('range', (type) => HistoryRanges, {
      description: `${Object.keys(HistoryRanges).map((key) => HistoryRanges[key])}`,
    })
    range: HistoryRanges
  ): Promise<AssetHistory> {
    return this.assetService.getHistory(await this.assetService.get({ symbol }), range)
  }

  @Query((returns) => AssetOHLC, { description: 'Get asset Open/High/Low/Close' })
  async assetOHLC(
    @Arg('symbol') symbol: string,
    @Arg('from', { description: 'timestamp' }) from: number,
    @Arg('to', { description: 'timestamp' }) to: number
  ): Promise<AssetOHLC> {
    return this.assetService.getOHLC(await this.assetService.get({ symbol }), from, to)
  }
}
