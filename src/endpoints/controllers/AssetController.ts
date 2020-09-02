import { KoaController, Get, Controller } from 'koa-joi-controllers'

@Controller('/asset')
export default class AssetController extends KoaController {
  @Get('/denom/history')
  async getAssetHistory(ctx): Promise<void> {
    // success(ctx)
  }
}
