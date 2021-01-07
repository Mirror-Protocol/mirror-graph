import { addDays } from 'date-fns'
import * as bluebird from 'bluebird'
import memoize from 'memoizee-decorator'
import { Repository, getConnection } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Container, Service, Inject } from 'typedi'
import { find, sortedUniq } from 'lodash'
import { num } from 'lib/num'
import { getTokenBalance } from 'lib/mirror'
import { getContractStore } from 'lib/terra'
import { getMethMirTokenBalance, getPairDayDatas, getPairsDayDatas } from 'lib/meth'
import { getMIRAnnualRewards } from 'lib/utils'
import { loadEthAssets } from 'lib/data'
import { GovService, AssetService, PriceService, OracleService, ContractService } from 'services'
import { DailyStatisticEntity, TxEntity, RewardEntity } from 'orm'
import { Statistic, TodayStatistic, ValueAt, AccountBalance } from 'graphql/schema'
import { ContractType } from 'types'

@Service()
export class StatisticService {
  constructor(
    @Inject((type) => GovService) private readonly govService: GovService,
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @Inject((type) => PriceService) private readonly priceService: PriceService,
    @Inject((type) => OracleService) private readonly oracleService: OracleService,
    @Inject((type) => ContractService) private readonly contractService: ContractService,
    @InjectRepository(DailyStatisticEntity)
    private readonly dailyRepo: Repository<DailyStatisticEntity>,
    @InjectRepository(TxEntity) private readonly txRepo: Repository<TxEntity>,
    @InjectRepository(RewardEntity) private readonly rewardRepo: Repository<RewardEntity>
  ) {}

  async statistic(network: string): Promise<Partial<Statistic>> {
    const assets = await this.assetService.getAll()
    let assetMarketCap = num(0)
    let totalValueLocked = num(0)

    await bluebird.map(assets, async (asset) => {
      if (asset.token === 'uusd') {
        totalValueLocked = totalValueLocked.plus(asset.positions.asCollateral)
        return
      }

      const price = await this.oracleService.getPrice(asset.token)
      if (!price) return

      assetMarketCap = assetMarketCap.plus(num(asset.positions.mint).multipliedBy(price))
      totalValueLocked = totalValueLocked.plus(
        num(asset.positions.asCollateral).multipliedBy(price)
      )
    })

    return {
      network,
      assetMarketCap: assetMarketCap.toFixed(0),
      totalValueLocked: totalValueLocked.toFixed(0),
      collateralRatio: totalValueLocked.dividedBy(assetMarketCap).multipliedBy(100).toFixed(2),
      ...(await this.mirSupply()),
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async mirSupply(): Promise<Partial<Statistic>> {
    const gov = this.govService.get()
    const mirrorToken = gov.mirrorToken
    const airdropContract = (await this.contractService.get({ type: ContractType.AIRDROP, gov }))
      .address
    const factoryContract = (await this.contractService.get({ type: ContractType.FACTORY, gov }))
      .address
    const communityContract = (
      await this.contractService.get({ type: ContractType.COMMUNITY, gov })
    ).address

    const airdropBalance = await getTokenBalance(mirrorToken, airdropContract)
    const factoryBalance = await getTokenBalance(mirrorToken, factoryContract)
    const communityBalance = await getTokenBalance(mirrorToken, communityContract)
    const methBalance = await getMethMirTokenBalance()

    const { totalSupply } = await getContractStore(mirrorToken, { tokenInfo: {} })
    const mirCirculatingSupply = num(totalSupply)
      .minus(airdropBalance)
      .minus(factoryBalance)
      .minus(communityBalance)
      .minus(methBalance)

    return {
      mirTotalSupply: totalSupply,
      mirCirculatingSupply: mirCirculatingSupply.toFixed(0),
    }
  }

  async today(network: string): Promise<TodayStatistic> {
    if (network === 'TERRA') {
      return this.todayTerra()
    } else if (network === 'METH') {
      return this.todayMeth()
    } else if (network === 'COMBINE') {
      const terra = await this.todayTerra()
      const meth = await this.todayMeth()

      return {
        transactions: num(terra.transactions).plus(meth.transactions).toString(),
        volume: num(terra.volume).plus(meth.volume).toString(),
        feeVolume: num(terra.feeVolume).plus(meth.feeVolume).toString(),
        mirVolume: num(terra.mirVolume).plus(meth.mirVolume).toString(),
      }
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async todayTerra(): Promise<TodayStatistic> {
    const from = Math.floor((Date.now() - (Date.now() % 86400000)) / 1000)
    const to = Math.floor(from + 86400)

    const txs = await this.txRepo
      .createQueryBuilder()
      .select('count(id)', 'count')
      .addSelect('sum(commission_value)', 'commission')
      .addSelect('sum(volume)', 'volume')
      .where('datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)', { from, to })
      .getRawOne()

    const mir = await this.txRepo
      .createQueryBuilder()
      .select('sum(volume)', 'volume')
      .where('datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)', { from, to })
      .andWhere('token = :token', { token: this.govService.get().mirrorToken })
      .getRawOne()

    return {
      transactions: txs?.count || '0',
      volume: txs?.volume || '0',
      feeVolume: txs?.commission || '0',
      mirVolume: mir?.volume || '0',
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async todayMeth(): Promise<TodayStatistic> {
    // start of today (UTC)
    const from = Date.now() - (Date.now() % 86400000)

    const assets = loadEthAssets()
    const pairAddresses = Object.keys(assets).map((token) => assets[token].pair)
    const datas = await getPairsDayDatas(pairAddresses, from, from)
    const transactions = datas.reduce((result, data) => result.plus(data.dailyTxns), num(0)).toString()
    const volume = datas.reduce((result, data) => result.plus(data.dailyVolumeToken1), num(0)).multipliedBy(1000000).toFixed(0)
    const feeVolume = num(volume).multipliedBy(0.003).multipliedBy(1000000).toFixed(0)
    const mirPair = find(assets, (asset) => asset.symbol === 'MIR')?.pair.toLowerCase()
    const mirVolume = mirPair
      ? num(find(datas, (data) => data.pairAddress === mirPair)?.dailyVolumeToken1 || '0').multipliedBy(1000000).toFixed(0)
      : '0'

    return {
      transactions,
      volume,
      feeVolume,
      mirVolume,
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async getGovAPR(): Promise<string> {
    const now = Date.now()
    const before7d = addDays(now, -7).getTime()

    // gov stake reward = ((7days reward amount) / 7 * 365) / (staked to gov MIR amount)
    const govEntity = this.govService.get()
    const govReward7d = (
      await this.rewardRepo
        .createQueryBuilder()
        .select('sum(amount)', 'amount')
        .where('datetime BETWEEN :from AND :to', { from: new Date(before7d), to: new Date(now) })
        .andWhere('token = :token', { token: govEntity.mirrorToken })
        .andWhere('is_gov_reward = true')
        .getRawOne()
    )?.amount
    const govStakedMir = await getTokenBalance(govEntity.mirrorToken, govEntity.gov)
    const govAPR = num(govReward7d).dividedBy(7).multipliedBy(365).dividedBy(govStakedMir)

    return !govAPR.isNaN() ? govAPR.toString() : '0'
  }

  async addDailyTradingVolume(
    timestamp: number,
    volume: string,
    repo = this.dailyRepo
  ): Promise<DailyStatisticEntity> {
    const datetime = new Date(timestamp - (timestamp % 86400000))
    let daily = await repo.findOne({ datetime })

    if (daily) {
      daily.tradingVolume = num(daily.tradingVolume).plus(volume).toString()
    } else {
      daily = new DailyStatisticEntity({
        gov: this.govService.get(),
        datetime,
        tradingVolume: volume,
      })
    }

    return repo.save(daily)
  }

  async calculateDailyCumulativeLiquidity(
    timestamp: number,
    repo = this.dailyRepo
  ): Promise<DailyStatisticEntity> {
    const datetime = new Date(timestamp - (timestamp % 86400000))
    const assets = await this.assetService.getAll()
    let liquidityValue = num(0)

    await bluebird.map(
      assets.filter((asset) => asset.token !== 'uusd'),
      async (asset) => {
        const price = await this.oracleService.getPrice(asset.token)
        if (!price) return

        liquidityValue = liquidityValue
          .plus(num(asset.positions.liquidity).multipliedBy(price))
          .plus(asset.positions.uusdLiquidity)
      }
    )

    const daily =
      (await repo.findOne({ datetime })) ||
      new DailyStatisticEntity({ gov: this.govService.get(), datetime })

    daily.cumulativeLiquidity = liquidityValue.toString()

    return repo.save(daily)
  }

  async getLiquidityHistory(network: string, from: number, to: number): Promise<ValueAt[]> {
    const fromDayUTC = from - (from % 86400000)
    const toDayUTC = to - (to % 86400000)

    if (network === 'TERRA') {
      return this.getLiquidityHistoryTerra(fromDayUTC, toDayUTC)
    } else if (network === 'METH') {
      return this.getLiquidityHistoryMeth(fromDayUTC, toDayUTC)
    } else if (network === 'COMBINE') {
      const terra = await this.getLiquidityHistoryTerra(fromDayUTC, toDayUTC)
      const meth = await this.getLiquidityHistoryMeth(fromDayUTC, toDayUTC)

      return terra.map((data) => ({
        timestamp: data.timestamp,
        value: num(data.value)
          .plus(meth.find((methData) => methData.timestamp === data.timestamp)?.value || 0)
          .toString()
      }))
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async getLiquidityHistoryTerra(from: number, to: number): Promise<ValueAt[]> {
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

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async getLiquidityHistoryMeth(from: number, to: number): Promise<ValueAt[]> {
    const assets = loadEthAssets()
    const pairAddresses = Object.keys(assets).map((token) => assets[token].pair)
    const datas = [
      ...await bluebird.map(
        pairAddresses,
        async (pair) => Object.assign((await getPairDayDatas(pair, 0, from, 1, 'desc'))[0], { timestamp: from })
      ),
      ...await getPairsDayDatas(pairAddresses, from + 86400000, to)
    ]
      .sort((a, b) => b.timestamp - a.timestamp)

    const history = []
    for (let timestamp = from; timestamp <= to; timestamp += 86400000) {
      history.push({
        timestamp,
        value: pairAddresses.reduce(
          (result, pair) => {
            const pairData = datas.find((data) => data.pairAddress === pair && data.timestamp <= timestamp)
            const liquidity = pairData
              ? num(pairData.reserve1).dividedBy(pairData.reserve0).multipliedBy(pairData.reserve0).plus(pairData.reserve1)
              : num(0)
            return result.plus(liquidity)
          },
          num(0)
        ).multipliedBy(1000000).toFixed(0)
      })
    }
    return history
  }

  async getTradingVolumeHistory(network: string, from: number, to: number): Promise<ValueAt[]> {
    const fromDayUTC = from - (from % 86400000)
    const toDayUTC = to - (to % 86400000)

    if (network === 'TERRA') {
      return this.getTradingVolumeHistoryTerra(fromDayUTC, toDayUTC)
    } else if (network === 'METH') {
      return this.getTradingVolumeHistoryMeth(fromDayUTC, toDayUTC)
    } else if (network === 'COMBINE') {
      const terra = await this.getTradingVolumeHistoryTerra(fromDayUTC, toDayUTC)
      const meth = await this.getTradingVolumeHistoryMeth(fromDayUTC, toDayUTC)

      return terra.map((data) => ({
        timestamp: data.timestamp,
        value: num(data.value)
          .plus(meth.find((methData) => methData.timestamp === data.timestamp)?.value || 0)
          .toString()
      }))
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async getTradingVolumeHistoryTerra(from: number, to: number): Promise<ValueAt[]> {
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

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async getTradingVolumeHistoryMeth(from: number, to: number): Promise<ValueAt[]> {
    const assets = loadEthAssets()
    const pairAddresses = Object.keys(assets).map((token) => assets[token].pair)
    const datas = await getPairsDayDatas(pairAddresses, from, to)

    return sortedUniq(datas.map((data) => data.timestamp)).map((timestamp) => ({
      timestamp,
      value: datas
        .filter((data) => data.timestamp === timestamp)
        .reduce((result, data) => result.plus(data.dailyVolumeToken1), num(0)).multipliedBy(1000000).toFixed(0)
    }))
  }

  async getAssetDayVolume(network: string, token: string, from: number, to: number): Promise<string> {
    if (network === 'TERRA') {
      return this.getAssetDayVolumeTerra(token, from, to)
    } else if (network === 'METH') {
      return this.getAssetDayVolumeMeth(token, from, to)
    } else if (network === 'COMBINE') {
      const terra = await this.getAssetDayVolumeTerra(token, from, to)
      const meth = await this.getAssetDayVolumeMeth(token, from, to)

      return num(terra).plus(meth).toString()
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async getAssetDayVolumeTerra(token: string, from: number, to: number): Promise<string> {
    const txs24h = await this.txRepo
      .createQueryBuilder()
      .select('sum(volume)', 'volume')
      .where(
        'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
        { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
      )
      .andWhere('token = :token', { token })
      .getRawOne()

    return txs24h?.volume || '0'
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async getAssetDayVolumeMeth(token: string, from: number, to: number): Promise<string> {
    const asset = await this.assetService.get({ token })
    const ethAssets = loadEthAssets()
    const ethAsset = find(ethAssets, (ethAsset) => ethAsset.symbol === asset.symbol)
    if (!ethAsset) {
      return '0'
    }
    const datas = await getPairDayDatas(ethAsset.pair, from, to, Math.floor((to - from) / 86400000) + 1, 'desc')
    return datas
      .reduce((result, data) => result.plus(data.dailyVolumeToken1), num(0))
      .multipliedBy(1000000)
      .toFixed(0)
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async getAssetAPR(token: string): Promise<string> {
    const asset = await this.assetService.get({ token })
    const { mirrorToken } = this.govService.get()

    const price = await this.priceService.getPrice(token)
    const mirPrice = await this.priceService.getPrice(mirrorToken)
    const liquidityValue = num(asset.positions.liquidity)
      .multipliedBy(price)
      .plus(asset.positions.uusdLiquidity)
    const rewardPerYear = getMIRAnnualRewards(Date.now(), token === mirrorToken)

    if (!rewardPerYear || !mirPrice || !price) return '0'

    const mirValue = num(rewardPerYear).multipliedBy(1000000).multipliedBy(mirPrice)
    const poolValue = liquidityValue.multipliedBy(
      num(asset.positions.lpStaked).dividedBy(asset.positions.lpShares)
    )

    // (24h MIR reward * MIR price * 365) / (liquidity value * (staked lp share/total lp share))
    const apr = mirValue.dividedBy(poolValue)

    return apr.isNaN() ? '0' : apr.toString()
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async richlist(token: string, offset: number, limit: number): Promise<AccountBalance[]> {
    // SELECT * FROM (
    //   SELECT DISTINCT ON (address) address,token,balance
    //   FROM balance
    //   WHERE token='terra14y5affaarufk3uscy2vr6pe6w6zqf2wpjzn5sh'
    //   ORDER BY address, id DESC  -- get latest balance per address
    // ) b
    // WHERE balance > 0
    // ORDER BY balance DESC;
    return getConnection()
      .createQueryBuilder()
      .select('b.address', 'address')
      .addSelect('b.balance', 'balance')
      .from(
        (subQuery) =>
          subQuery
            .select('DISTINCT ON (address) address, balance')
            .from('balance', 'balance')
            .where('token = :token', { token })
            .orderBy('address')
            .addOrderBy('id', 'DESC'),
        'b'
      )
      .where('balance > 0')
      .orderBy('balance', 'DESC')
      .skip(offset)
      .take(limit)
      .getRawMany()
  }
}

export function statisticService(): StatisticService {
  return Container.get(StatisticService)
}
