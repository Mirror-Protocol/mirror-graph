import { Resolver, FieldResolver, Root } from 'type-graphql'
import { AssetEntity } from 'orm'
import { AccountService } from 'services'
import { AssetPositions } from 'graphql/schema'

@Resolver((of) => AssetPositions)
export class AssetPositionsResolver {
  constructor(private readonly accountService: AccountService) {}

  @FieldResolver()
  async token(@Root('asset') asset: AssetEntity, @Root('address') address: string): Promise<string> {
    return (await this.accountService.getAssetBalance(address, asset))?.balance
  }

  // @FieldResolver()
  // async lpToken(@Root('asset') asset: AssetEntity, @Root('address') address: string): Promise<string> {
  //   return (await this.accountService.getLiquidityBalance(address, asset))?.balance
  // }

  // @FieldResolver()
  // async mint(@Root('asset') asset: AssetEntity, @Root('address') address: string): Promise<string> {
  //   return (await this.accountService.getMintPosition(address, asset))?.assetAmount
  // }

  // @FieldResolver()
  // async collateral(@Root('asset') asset: AssetEntity, @Root('address') address: string): Promise<string> {
  //   return (await this.accountService.getMintPosition(address, asset))?.collateralAmount
  // }
}
