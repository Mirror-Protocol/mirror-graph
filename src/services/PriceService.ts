import memoize from 'memoizee-decorator'
import { Container, Service } from 'typedi'
import { Repository, FindConditions, FindOneOptions, LessThanOrEqual, getConnection } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { num } from 'lib/num'
import { getOHLC } from 'lib/price'
import { getPairPrice } from 'lib/mirror'
import { PriceEntity } from 'orm'
import { AssetOHLC, PriceAt } from 'graphql/schema'

@Service()
export class PriceService {
  constructor(@InjectRepository(PriceEntity) private readonly repo: Repository<PriceEntity>) {}

  async get(
    conditions: FindConditions<PriceEntity>,
    options?: FindOneOptions<PriceEntity>,
    repo = this.repo
  ): Promise<PriceEntity> {
    return repo.findOne(conditions, options)
  }

  async getPrice(token: string, repo = this.repo): Promise<string> {
    const price = await repo.findOne(
      { token },
      {
        select: ['close', 'datetime'],
        order: { datetime: 'DESC' },
      }
    )
    return price?.close
  }

  @memoize({ promise: true, maxAge: 60000, preFetch: true }) // 1 minute
  async getPriceAt(
    token: string,
    timestamp: number = Date.now(),
    repo = this.repo
  ): Promise<string> {
    const price = await repo.findOne(
      { token, datetime: LessThanOrEqual(new Date(timestamp)) },
      {
        select: ['close', 'datetime'],
        order: { datetime: 'DESC' },
      }
    )
    return price?.close
  }

  async getContractPrice(pair: string): Promise<string> {
    return getPairPrice(pair)
  }

  async setOHLC(
    token: string,
    timestamp: number,
    price: string,
    repo = this.repo,
    needSave = true
  ): Promise<PriceEntity> {
    const datetime = new Date(timestamp - (timestamp % 60000))
    let priceEntity = await repo.findOne({ token, datetime })

    if (priceEntity) {
      priceEntity.high = num(price).isGreaterThan(priceEntity.high) ? price : priceEntity.high
      priceEntity.low = num(price).isLessThan(priceEntity.low) ? price : priceEntity.low
      priceEntity.close = price
    } else {
      priceEntity = new PriceEntity({
        token,
        open: price,
        high: price,
        low: price,
        close: price,
        datetime,
      })
    }

    return needSave ? repo.save(priceEntity) : priceEntity
  }

  async getOHLC(token: string, from: number, to: number, repo = this.repo): Promise<AssetOHLC> {
    return getOHLC<PriceEntity>(repo, token, from, to)
  }

  @memoize({ promise: true, maxAge: 60000 }) // 1 minute
  async getHistory(
    token: string | string[],
    from: number,
    to: number,
    interval: number,
    repo = this.repo
  ): Promise<PriceAt[]> {
    return getConnection().query('SELECT * FROM public.priceHistory($1, $2, $3, $4)', [
      token,
      new Date(from),
      new Date(to),
      interval,
    ])
  }
}

export function priceService(): PriceService {
  return Container.get(PriceService)
}
