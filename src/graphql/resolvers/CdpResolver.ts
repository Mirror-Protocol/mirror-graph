import { MoreThan, Raw } from 'typeorm'
import { Resolver, Query, Arg } from 'type-graphql'
import { Cdp } from 'graphql/schema'
import { CdpService } from 'services'

@Resolver((of) => Cdp)
export class CdpResolver {
  constructor(private readonly cdpService: CdpService) {}

  @Query((returns) => [Cdp], { description: 'Get all cdps' })
  async cdps(
    @Arg('maxRatio') maxRatio: number,
    @Arg('address', { nullable: true }) address?: string,
  ): Promise<Cdp[]> {
    const addressCondition = address ? { address } : {}
    return this.cdpService.getAll({
      where: {
        collateralRatio: Raw((alias) => `${alias} < ${maxRatio}`),
        mintAmount: MoreThan(0),
        ...addressCondition
      }
    })
  }
}
