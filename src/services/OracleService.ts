import memoize from 'memoizee-decorator'
import { Container, Service } from 'typedi'
import { Repository, FindConditions, LessThanOrEqual, getConnection } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { transform } from 'lodash'
import { num } from 'lib/num'
import { getOHLC } from 'lib/price'
import { getOraclePrice } from 'lib/mirror'
import { OraclePriceEntity } from 'orm'
import { AssetOHLC, PriceAt } from 'graphql/schema'
import { govService } from 'services'

@Service()
export class OracleService {
  constructor(
    @InjectRepository(OraclePriceEntity) private readonly repo: Repository<OraclePriceEntity>
  ) {}

  async get(
    conditions: FindConditions<OraclePriceEntity>,
    repo = this.repo
  ): Promise<OraclePriceEntity> {
    return repo.findOne(conditions)
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

  async getLatestPrices(timestamp: number): Promise<{ [token: string]: string }> {
    const prices = await getConnection().query(
      'SELECT token, price FROM public.latestOraclePrices($1)',
      [new Date(timestamp)]
    )

    return transform(
      prices,
      (result, value) => {
        if (value?.price) result[value.token] = value.price
      },
      {}
    )
  }

  async getContractPrice(token: string): Promise<string> {
    return getOraclePrice(govService().get().oracle, token)
  }

  async setOHLC(
    token: string,
    timestamp: number,
    price: string,
    repo = this.repo,
    needSave = true
  ): Promise<OraclePriceEntity> {
    const datetime = new Date(timestamp - (timestamp % 60000))
    let priceEntity = await repo.findOne({ token, datetime })

    if (priceEntity) {
      priceEntity.high = num(price).isGreaterThan(priceEntity.high) ? price : priceEntity.high
      priceEntity.low = num(price).isLessThan(priceEntity.low) ? price : priceEntity.low
      priceEntity.close = price
    } else {
      priceEntity = new OraclePriceEntity({
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
    return getOHLC<OraclePriceEntity>(repo, token, from, to)
  }

  @memoize({ promise: true, maxAge: 60000, preFetch: true }) // 1 minute
  async getHistory(
    token: string,
    from: number,
    to: number,
    interval: number,
    repo = this.repo
  ): Promise<PriceAt[]> {
    return getConnection().query('SELECT * FROM public.oracleHistory($1, $2, $3, $4)', [
      token,
      new Date(from),
      new Date(to),
      interval,
    ])
  }
}

export function oracleService(): OracleService {
  return Container.get(OracleService)
}
