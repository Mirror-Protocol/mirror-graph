import { Service, Inject } from 'typedi'
import { OwnerService, AssetService } from 'services'

@Service()
export class MinterService {
  constructor(
    @Inject((type) => OwnerService) private readonly programService: OwnerService,
    @Inject((type) => AssetService) private readonly assetService: AssetService
  ) {}
}
