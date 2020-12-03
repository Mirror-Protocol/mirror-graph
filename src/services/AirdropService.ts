import * as bluebird from 'bluebird'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository, FindConditions, FindOneOptions, FindManyOptions } from 'typeorm'
import { Container, Service } from 'typedi'
import { isAirdropClaimed } from 'lib/meth'
import { AirdropEntity } from 'orm'

@Service()
export class AirdropService {
  constructor(@InjectRepository(AirdropEntity) private readonly repo: Repository<AirdropEntity>) {}

  async get(
    conditions: FindConditions<AirdropEntity>,
    options?: FindOneOptions<AirdropEntity>,
    repo = this.repo,
  ): Promise<AirdropEntity> {
    return repo.findOne(conditions, options)
  }

  async getAll(options?: FindManyOptions<AirdropEntity>, repo = this.repo): Promise<AirdropEntity[]> {
    return repo.find(options)
  }

  async newAirdrop(airdrop: Partial<AirdropEntity>, repo = this.repo): Promise<AirdropEntity> {
    return repo.save(airdrop)
  }

  async getAirdrop(network: string, address: string, repo = this.repo): Promise<AirdropEntity[]> {
    const list = await this.getAll({
      where: { network, address, claimable: true },
      order: { id: 'ASC' },
    }, repo)

    if (network === 'TERRA') {
      return list
    } else if(network === 'ETH') {
      return bluebird.mapSeries(list, async (entity) => {
        const isClaimed = await isAirdropClaimed(entity.stage.toString())
        if (isClaimed) {
          entity.claimable = false
          await repo.save(entity)
          return
        }

        return entity
      }).filter(Boolean)
    }
  }
}

export function airdropService(): AirdropService {
  return Container.get(AirdropService)
}
