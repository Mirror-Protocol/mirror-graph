import { KoaController, Get, Controller } from 'koa-joi-controllers'
import Container from 'typedi'
import { AssetService } from 'services'
import { success } from 'lib/response'

@Controller('/assets')
export default class AssetController extends KoaController {
  @Get('/')
  async getAssetHistory(ctx): Promise<void> {
    const assets = await Container.get(AssetService).getListedAssets()

    success(
      ctx,
      assets.map((asset) => asset.apiResponse())
    )
  }
}
