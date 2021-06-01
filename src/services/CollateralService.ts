import { Container, Service, Inject } from 'typedi'
import { AssetService, PriceService, OracleService } from 'services'

@Service()
export class CollateralService {
  constructor(
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @Inject((type) => PriceService) private readonly priceService: PriceService,
    @Inject((type) => OracleService) private readonly oracleService: OracleService,
  ) {}

  async getPrice(token: string): Promise<string> {
    const asset = await this.assetService.get({ token })
    if (!asset) {
      throw new Error(`${token} is not supported collateral`)
    }

    if (token === 'uusd') {
      return '1'
    } else if (asset.symbol === 'MIR') {
      return this.priceService.getPrice(token)
    } else {
      return this.oracleService.getPrice(token)
    }
  }
}

export function collateralService(): CollateralService {
  return Container.get(CollateralService)
}
