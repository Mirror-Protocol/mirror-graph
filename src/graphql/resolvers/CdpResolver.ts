import { LessThanOrEqual } from 'typeorm'
import { Resolver, Query } from 'type-graphql'
import { Cdp } from 'graphql/schema'
import { CdpService } from 'services'

@Resolver((of) => Cdp)
export class CdpResolver {
  constructor(private readonly cdpService: CdpService) {}

  @Query((returns) => [Cdp], { description: 'Get all cdps' })
  async cdps(): Promise<Cdp[]> {
    return this.cdpService.getAll({ where: { collateralRatio: LessThanOrEqual(1) }})
  }
}
