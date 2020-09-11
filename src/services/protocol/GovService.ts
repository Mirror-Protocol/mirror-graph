import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Service } from 'typedi'
import { Key } from '@terra-money/terra.js'
import { GovEntity } from 'orm'
import { CodeIds } from 'types'
import * as logger from 'lib/logger'
import config from 'config'

@Service()
export class GovService {
  private gov: GovEntity

  constructor(@InjectRepository(GovEntity) private readonly govRepo: Repository<GovEntity>) {}

  async load(id: number): Promise<GovEntity> {
    const findOptions = id !== -1 ? { id } : { order: { createdAt: 'DESC' } }
    this.gov = await this.govRepo.findOne(findOptions)
    if (!this.gov) {
      logger.warn(`can't load any contract. id: ${id}`)
    }

    return this.gov
  }

  async create(codeIds: CodeIds, key: Key): Promise<GovEntity> {
    return this.govRepo.save({
      codeIds,
      factory: '',
      collector: '',
      gov: '',
      mirrorToken: '',
      owner: key.accAddress,
      chainId: config.TERRA_CHAIN_ID,
    })
  }

  async set(option: Partial<GovEntity>): Promise<GovEntity> {
    this.gov = Object.assign(this.gov, option)
    return this.govRepo.save(this.gov)
  }

  getGov(): GovEntity {
    return this.gov
  }
}
