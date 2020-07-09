import { Service, Inject } from 'typedi'
import { ContractService, AssetService } from 'services'

@Service()
export class MinterService {
  constructor(
    @Inject((type) => ContractService) private readonly programService: ContractService,
    @Inject((type) => AssetService) private readonly assetService: AssetService
  ) {}
}
