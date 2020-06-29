import { Service, Inject } from 'typedi'
import { ProgramService, AssetService } from 'services'

@Service()
export class MinterService {
  constructor(
    @Inject((type) => ProgramService) private readonly programService: ProgramService,
    @Inject((type) => AssetService) private readonly assetService: AssetService
  ) {}
}
