import * as bluebird from 'bluebird'
import memoize from 'memoizee-decorator'
import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Container, Service, Inject } from 'typedi'
import { getTokenBalance, getTokenInfo, getDistributionInfo, getStakingPool } from 'lib/mirror'
import { getContractStore, isNativeToken } from 'lib/terra'
import { getMethMirTokenBalance } from 'lib/eth'
import { num } from 'lib/num'
import {
  GovService,
  AssetService,
  AccountService,
  PriceService,
  OracleService,
  ContractService,
  ethStatisticService,
  // bscStatisticService,
} from 'services'
import { DailyStatisticEntity, TxEntity } from 'orm'
import { ContractType, AssetStatus } from 'types'
import { PeriodStatistic, ValueAt, APR, TVL, MirSupply } from 'graphql/schema'

@Service()
export class TerraStatisticService {
  constructor(
    @Inject((type) => GovService) private readonly govService: GovService,
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @Inject((type) => AccountService) private readonly accountService: AccountService,
    @Inject((type) => PriceService) private readonly priceService: PriceService,
    @Inject((type) => OracleService) private readonly oracleService: OracleService,
    @Inject((type) => ContractService) private readonly contractService: ContractService,
    @InjectRepository(DailyStatisticEntity)
    private readonly dailyRepo: Repository<DailyStatisticEntity>,
    @InjectRepository(TxEntity) private readonly txRepo: Repository<TxEntity>,
  ) {}

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async totalValueLocked(): Promise<TVL> {
    const { mirrorToken, gov } = this.govService.get()
    const assets = await this.assetService.getAll({
      where: [{ status: AssetStatus.LISTED }, { status: AssetStatus.DELISTED }]
    })

    const collateral = await this.collateralValue()

    let liquidity = '0'
    await bluebird.map(assets, async (asset) => {
      const assetLiquidity = (await this.getAssetLiquidity(asset.token)) || '0'
      liquidity = num(liquidity).plus(assetLiquidity).toFixed(0)
    })

    const mirBalance = await getTokenBalance(mirrorToken, gov)
    const mirPrice = await this.priceService.getPrice(mirrorToken)
    const stakedMir = (mirPrice && mirBalance)
      ? num(mirBalance).multipliedBy(mirPrice).toFixed(0)
      : '0'

    return {
      total: num(collateral).plus(liquidity).plus(stakedMir).toFixed(0),
      collateral,
      liquidity,
      stakedMir
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async collateralValue(): Promise<string> {
    const { mint, mirrorToken } = this.govService.get()
    const mirPrice = await this.priceService.getPrice(mirrorToken)
    const assets = await this.assetService.getAll()
    let collateralValue = num(0)

    await bluebird.map(assets, async (asset) => {
      const { token, symbol } = asset
      if (token === 'uusd') {
        const { balance } = await this.accountService.getBalance(mint, 'uusd')
        collateralValue = collateralValue.plus(balance)
        return
      }

      const price = symbol !== 'MIR' ? await this.oracleService.getPrice(token) : mirPrice
      if (!price) return

      const balance = isNativeToken(token)
        ? (await this.accountService.getBalance(mint, token))?.balance || '0'
        : await getTokenBalance(token, mint)
      const collateral = num(balance).multipliedBy(price)
      collateralValue = collateralValue.plus(collateral)
    })

    return collateralValue.toFixed(0)
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async assetMarketCap(): Promise<string> {
    const assets = (await this.assetService.getAll({
      where: [{ status: AssetStatus.LISTED }, { status: AssetStatus.DELISTED }]
    })).filter((asset) => asset.symbol !== 'MIR')
    let assetMarketCap = num(0)

    await bluebird.map(assets, async (asset) => {
      const price = await this.priceService.getPrice(asset.token)
      if (!price) return

      const { totalSupply } = await getTokenInfo(asset.token)

      assetMarketCap = assetMarketCap.plus(num(totalSupply).multipliedBy(price))
    })

    // decrease eth,bsc market cap
    assetMarketCap = assetMarketCap
      .minus(await ethStatisticService().assetMarketCap())
      // .minus(await bscStatisticService().assetMarketCap())

    return assetMarketCap.toFixed(0)
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async mirSupply(): Promise<MirSupply> {
    const govEntity = this.govService.get()
    const { mirrorToken, factory } = govEntity
    const airdrop = (await this.contractService.get({ type: ContractType.AIRDROP, gov: govEntity }))
      .address
    const community = (
      await this.contractService.get({ type: ContractType.COMMUNITY, gov: govEntity })
    ).address

    const airdropBalance = await getTokenBalance(mirrorToken, airdrop)
    const factoryBalance = await getTokenBalance(mirrorToken, factory)
    const communityBalance = await getTokenBalance(mirrorToken, community)
    const methBalance = await getMethMirTokenBalance()

    const { totalSupply } = await getContractStore(mirrorToken, { tokenInfo: {} })
    const circulating = num(totalSupply)
      .minus(airdropBalance)
      .minus(factoryBalance)
      .minus(communityBalance)
      .minus(methBalance)
      .toFixed(0)

    return {
      circulating,
      liquidity: (await this.assetService.get({ token: mirrorToken })).positions.pool,
      staked: await getTokenBalance(mirrorToken, govEntity.gov),
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async today(): Promise<PeriodStatistic> {
    const from = Date.now() - (Date.now() % 86400000)
    const to = from + 86400000

    const txs = await this.txRepo
      .createQueryBuilder()
      .select('COUNT(id)', 'count')
      .addSelect('COUNT(DISTINCT address)', 'users')
      .addSelect('SUM(commission_value)', 'commission')
      .addSelect('SUM(volume)', 'volume')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .getRawOne()

    const mir = await this.txRepo
      .createQueryBuilder()
      .select('SUM(volume)', 'volume')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .andWhere('token = :token', { token: this.govService.get().mirrorToken })
      .getRawOne()

    return {
      transactions: txs?.count || '0',
      volume: txs?.volume || '0',
      feeVolume: txs?.commission || '0',
      mirVolume: mir?.volume || '0',
      activeUsers: txs?.users || '0'
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async latest24h(): Promise<PeriodStatistic> {
    const to = Date.now()
    const from = to - 86400000

    const txs = await this.txRepo
      .createQueryBuilder()
      .select('COUNT(id)', 'count')
      .addSelect('COUNT(DISTINCT address)', 'users')
      .addSelect('SUM(commission_value)', 'commission')
      .addSelect('SUM(volume)', 'volume')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .getRawOne()

    const mir = await this.txRepo
      .createQueryBuilder()
      .select('SUM(volume)', 'volume')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .andWhere('token = :token', { token: this.govService.get().mirrorToken })
      .getRawOne()

    return {
      transactions: txs?.count || '0',
      volume: txs?.volume || '0',
      feeVolume: txs?.commission || '0',
      mirVolume: mir?.volume || '0',
      activeUsers: txs?.users || '0'
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async getLiquidityHistory(from: number, to: number): Promise<ValueAt[]> {
    return this.dailyRepo
      .createQueryBuilder()
      .select('extract(epoch from datetime) * 1000', 'timestamp')
      .addSelect('cumulative_liquidity', 'value')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .orderBy('datetime', 'ASC')
      .getRawMany()
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async getTradingVolumeHistory(from: number, to: number): Promise<ValueAt[]> {
    return this.dailyRepo
      .createQueryBuilder()
      .select('extract(epoch from datetime) * 1000', 'timestamp')
      .addSelect('trading_volume', 'value')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .orderBy('datetime', 'ASC')
      .getRawMany()
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async getAssetDayVolume(token: string, timestamp: number): Promise<string> {
    const from = timestamp
    const to = from + 86400000
    const txs = await this.txRepo
      .createQueryBuilder()
      .select('sum(volume)', 'volume')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .andWhere('token = :token', { token })
      .getRawOne()

    return txs?.volume || '0'
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async getAsset24h(token: string): Promise<{ volume: string; transactions: string }> {
    const from = Date.now() - (60000 * 60 * 24)
    const to = Date.now()
    const txs = await this.txRepo
      .createQueryBuilder()
      .select('sum(volume)', 'volume')
      .addSelect('count(id)', 'count')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .andWhere('token = :token', { token })
      .getRawOne()

    return {
      volume: txs?.volume || '0',
      transactions: txs?.count || '0',
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async getAssetLiquidity(token: string): Promise<string> {
    const asset = await this.assetService.get({ token })
    const price = await this.priceService.getPrice(token)
    if (!asset || !price || asset.positions.uusdPool === '0' || asset.positions.pool === '0') {
      return '0'
    }
    return num(asset.positions.uusdPool).dividedBy(asset.positions.pool).multipliedBy(asset.positions.pool)
      .plus(asset.positions.uusdPool)
      .toFixed(0)
  }

  @memoize({ promise: true, maxAge: 60000 * 5, preFetch: true }) // 5 minutes
  async getAnnualRewardTable(): Promise<{ [token: string]: string }> {
    // genesis(2020.12.04 04:00 KST) + 6hours
    const DISTRIBUTE_START = 1607022000000 + (60000 * 60 * 6)
    const ONE_YEAR = 60000 * 60 * 24 * 365

    const distributionSchedule = [
      [               DISTRIBUTE_START, ONE_YEAR * 1 + DISTRIBUTE_START, '54900000000000'],
      [ONE_YEAR * 1 + DISTRIBUTE_START, ONE_YEAR * 2 + DISTRIBUTE_START, '27450000000000'],
      [ONE_YEAR * 2 + DISTRIBUTE_START, ONE_YEAR * 3 + DISTRIBUTE_START, '13725000000000'],
      [ONE_YEAR * 3 + DISTRIBUTE_START, ONE_YEAR * 4 + DISTRIBUTE_START,  '6862500000000'],
    ]

    const now = Date.now()
    const schedule = distributionSchedule.find((schedule) => now >= schedule[0] && now <= schedule[1])
    const reward = Array.isArray(schedule) ? schedule[2] : '0'

    const { weights } = await getDistributionInfo(this.govService.get().factory)
    if (reward === '0' || !weights) {
      return {}
    }
    const totalWeight = weights.reduce((result, data) => result.plus(data[1]), num(0))
    const getTokenReward = (weight) => num(reward).multipliedBy(num(weight).dividedBy(totalWeight))

    return weights
      .filter((data) => num(data[1]).isGreaterThan(0))
      .reduce(
        (result, data) => Object.assign(result, {
          [data[0]]: getTokenReward(data[1]).toFixed(0)
        }),
        {}
      )
  }

  @memoize({ promise: true, maxAge: 60000, preFetch: true }) // 1 minute
  async getAssetAPR(token: string): Promise<APR> {
    const asset = await this.assetService.get({ token })
    const { mirrorToken, staking } = this.govService.get()
    const { positions } = asset

    const mirPrice = await this.priceService.getPrice(mirrorToken)
    const liquidityValue = num(positions.uusdPool)
      .dividedBy(positions.pool)
      .multipliedBy(positions.pool)
      .plus(positions.uusdPool)
    const poolValue = liquidityValue
      .multipliedBy(num(positions.lpStaked).dividedBy(positions.lpShares))
 
    const annualReward = (await this.getAnnualRewardTable())[token]
    if (
      !annualReward || annualReward === '0' || !mirPrice || mirPrice === '0' || poolValue.isNaN() || liquidityValue.isNaN()
    ) {
      return { long: '0', short: '0' }
    }

    const { shortRewardWeight } = await getStakingPool(staking, token)
    const longReward = num(annualReward).multipliedBy(num(1).minus(shortRewardWeight || 0))
    const shortReward = num(annualReward).multipliedBy(shortRewardWeight)

    // (Annual MIR reward * MIR price) / (liquidity value * (staked lp share/total lp share))
    return {
      long: longReward.multipliedBy(mirPrice).dividedBy(poolValue).toFixed(3),
      short: shortReward.multipliedBy(mirPrice).dividedBy(poolValue).toFixed(3),
    }
  }
}

export function terraStatisticService(): TerraStatisticService {
  return Container.get(TerraStatisticService)
}
