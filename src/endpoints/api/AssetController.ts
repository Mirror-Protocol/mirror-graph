import { KoaController, Get, Controller } from 'koa-joi-controllers'
import Container from 'typedi'
import { AssetService } from 'services'
import { success } from 'endpoints'

@Controller('/assets')
export default class AssetController extends KoaController {
  @Get('/')
  async getAssetHistory(ctx): Promise<void> {
    success(ctx, await Container.get(AssetService).getListedAssets())
  }
}
