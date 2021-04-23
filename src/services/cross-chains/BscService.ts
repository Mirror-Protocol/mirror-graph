import memoize from 'memoizee-decorator'
import { Container, Service, Inject } from 'typedi'
import { find } from 'lodash'
import { loadBscAssets } from 'lib/data'
import { AssetService } from 'services'
import { EthAsset, EthAssets } from 'types'

@Service()
export class BscService {
  constructor(
    @Inject((type) => AssetService) private readonly assetService: AssetService,
  ) {}

  @memoize({})
  getAssets(): EthAssets {
    return loadBscAssets()
  }

  @memoize({})
  async getAsset(token: string): Promise<EthAsset> {
    return find(this.getAssets(), (ethAsset) => ethAsset.terraToken === token)
  }
}

export function bscService(): BscService {
  return Container.get(BscService)
}
