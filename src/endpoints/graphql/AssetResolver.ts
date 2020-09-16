import { Resolver, Query, Arg, Root, FieldResolver } from 'type-graphql'
import { AssetEntity } from 'orm'
import { Asset, ContractType, MintPosition } from 'types'
import { AssetService, ContractService, AccountService } from 'services'

@Resolver((of) => Asset)
export class AssetResolver {
  constructor(
    private readonly assetService: AssetService,
    private readonly contractService: ContractService,
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
    const { balance } = await this.accountService.getAssetBalance(address, asset)
    return balance
  }

  @FieldResolver()
  async mintPosition(@Root() asset: AssetEntity, @Arg('address') address: string): Promise<MintPosition> {
    return this.accountService.getMintPosition(address, asset)
  }

  @FieldResolver()
  async liquidityBalance(@Root() asset: AssetEntity, @Arg('address') address: string): Promise<string> {
    const { balance } = await this.accountService.getLiquidityBalance(address, asset)
    return balance
  }
}
