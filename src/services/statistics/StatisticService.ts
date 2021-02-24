import * as bluebird from 'bluebird'
import memoize from 'memoizee-decorator'
import { Repository, getConnection } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Container, Service, Inject } from 'typedi'
import { num, aprToApy } from 'lib/num'
import { getTokenBalance } from 'lib/mirror'
import {
  GovService,
  AssetService,
  EthService,
  BscService,
  TerraStatisticService,
  EthStatisticService,
  BscStatisticService,
} from 'services'
import { DailyStatisticEntity, RewardEntity } from 'orm'
import { Statistic, PeriodStatistic, ValueAt, AccountBalance } from 'graphql/schema'
import { Network, AssetStatus } from 'types'

@Service()
export class StatisticService {
  constructor(
    @Inject((type) => GovService) private readonly govService: GovService,
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @Inject((type) => EthService) private readonly ethService: EthService,
    @Inject((type) => BscService) private readonly bscService: BscService,
    @Inject((type) => TerraStatisticService) private readonly terraStatisticService: TerraStatisticService,
    @Inject((type) => EthStatisticService) private readonly ethStatisticService: EthStatisticService,
    @Inject((type) => BscStatisticService) private readonly bscStatisticService: BscStatisticService,
    @InjectRepository(DailyStatisticEntity)
    private readonly dailyRepo: Repository<DailyStatisticEntity>,
    @InjectRepository(RewardEntity) private readonly rewardRepo: Repository<RewardEntity>
  ) {}

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async statistic(network: Network): Promise<Partial<Statistic>> {
    const stat = {
      network,
      collateralRatio: await this.terraStatisticService.collateralRatio(),
      ...await this.terraStatisticService.mirSupply(),
    }

    if (network === Network.TERRA) {
      return {
        ...stat,
        totalValueLocked: await this.terraStatisticService.totalValueLocked(),
        assetMarketCap: await this.terraStatisticService.assetMarketCap(),
      }
    } else if (network === Network.ETH) {
      return {
        ...stat,
        totalValueLocked: await this.ethStatisticService.totalValueLocked(),
        assetMarketCap: await this.ethStatisticService.assetMarketCap(),
      }
    } else if (network === Network.BSC) {
      return {
        totalValueLocked: await this.bscStatisticService.totalValueLocked(),
        assetMarketCap: await this.bscStatisticService.assetMarketCap(),
        ...stat,
      }
    } else if (network === Network.COMBINE) {
      const tvls = [
        await this.terraStatisticService.totalValueLocked(),
        await this.ethStatisticService.totalValueLocked(),
        await this.bscStatisticService.totalValueLocked(),
      ]
      const assetMarketCaps = [
        await this.terraStatisticService.assetMarketCap(),
        await this.ethStatisticService.assetMarketCap(),
        await this.bscStatisticService.assetMarketCap(),
      ]

      return {
        ...stat,
        totalValueLocked: tvls.reduce((result, tvl) => result.plus(tvl), num(0)).toString(),
        assetMarketCap: assetMarketCaps.reduce((result, assetMarketCap) => result.plus(assetMarketCap), num(0)).toString(),
      }
    }
  }

  async today(network: Network): Promise<PeriodStatistic> {
    if (network === Network.TERRA) {
      return this.terraStatisticService.today()
    } else if (network === Network.ETH) {
      return this.ethStatisticService.today()
    } else if (network === Network.BSC) {
      return this.bscStatisticService.today()
    } else if (network === Network.COMBINE) {
      const statistics = [
        await this.terraStatisticService.today(),
        await this.ethStatisticService.today(),
        await this.bscStatisticService.today(),
      ]

      return {
        transactions: statistics.reduce((result, stat) => result.plus(stat.transactions), num(0)).toString(),
        volume: statistics.reduce((result, stat) => result.plus(stat.volume), num(0)).toString(),
        feeVolume: statistics.reduce((result, stat) => result.plus(stat.feeVolume), num(0)).toString(),
        mirVolume: statistics.reduce((result, stat) => result.plus(stat.mirVolume), num(0)).toString(),
        activeUsers: statistics.reduce((result, stat) => result.plus(stat.activeUsers), num(0)).toString(),
      }
    }
  }

  async latest24h(network: Network): Promise<PeriodStatistic> {
    if (network === Network.TERRA) {
      return this.terraStatisticService.latest24h()
    } else if (network === Network.ETH) {
      return this.ethStatisticService.latest24h()
    } else if (network === Network.BSC) {
      return this.bscStatisticService.latest24h()
    } else if (network === Network.COMBINE) {
      const terra = await this.terraStatisticService.latest24h()
      const eth = await this.ethStatisticService.latest24h()

      return {
        transactions: num(terra.transactions).plus(eth.transactions).toString(),
        volume: num(terra.volume).plus(eth.volume).toString(),
        feeVolume: num(terra.feeVolume).plus(eth.feeVolume).toString(),
        mirVolume: num(terra.mirVolume).plus(eth.mirVolume).toString(),
        activeUsers: num(terra.activeUsers).plus(eth.activeUsers).toString(),
      }
    }
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async getGovAPY(): Promise<string> {
    const to = Date.now()
    const from = Date.now() - (60000 * 60 * 24 * 7) // 7days ago

    // gov stake reward = ((7days reward amount) / 7 * 365) / (staked to gov MIR amount)
    const govEntity = this.govService.get()
    const govReward7d = (
      await this.rewardRepo
        .createQueryBuilder()
        .select('sum(amount)', 'amount')
        .where(
          'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
          { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
        )
        .andWhere('token = :token', { token: govEntity.mirrorToken })
        .andWhere('is_gov_reward = true')
        .getRawOne()
    )?.amount
    const govStakedMir = await getTokenBalance(govEntity.mirrorToken, govEntity.gov)
    const govAPY = num(govReward7d).dividedBy(7).multipliedBy(365).dividedBy(govStakedMir)

    return !govAPY.isNaN() ? govAPY.toString() : '0'
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
    const assets = await this.assetService.getAll({ where: { status: AssetStatus.LISTED }})
    let liquidityValue = num(0)

    await bluebird.map(
      assets.filter((asset) => asset.token !== 'uusd'),
      async (asset) => {
        const { pool, uusdPool } = asset.positions

        if (pool !== '0' && uusdPool != '0') {
          liquidityValue = liquidityValue
              .plus(num(uusdPool).dividedBy(pool).multipliedBy(pool))
              .plus(uusdPool)
        }
      }
    )

    const daily =
      (await repo.findOne({ datetime })) ||
      new DailyStatisticEntity({ gov: this.govService.get(), datetime })

    daily.cumulativeLiquidity = liquidityValue.toString()

    return repo.save(daily)
  }

  async getLiquidityHistory(network: Network, from: number, to: number): Promise<ValueAt[]> {
    const fromDayUTC = Math.max(from - (from % 86400000), 1606953600000)
    const toDayUTC = to - (to % 86400000)

    if (network === Network.TERRA) {
      return this.terraStatisticService.getLiquidityHistory(fromDayUTC, toDayUTC)
    } else if (network === Network.ETH) {
      return this.ethStatisticService.getLiquidityHistory(fromDayUTC, toDayUTC)
    } else if (network === Network.BSC) {
      return this.bscStatisticService.getLiquidityHistory(fromDayUTC, toDayUTC)
    } else if (network === Network.COMBINE) {
      const terra = await this.terraStatisticService.getLiquidityHistory(fromDayUTC, toDayUTC)
      const eth = await this.ethStatisticService.getLiquidityHistory(fromDayUTC, toDayUTC)
      const bsc = await this.bscStatisticService.getLiquidityHistory(fromDayUTC, toDayUTC)

      return terra.map((data) => ({
        timestamp: data.timestamp,
        value: num(data.value)
          .plus(eth.find((ethData) => ethData.timestamp === data.timestamp)?.value || 0)
          .plus(bsc.find((bscData) => bscData.timestamp === data.timestamp)?.value || 0)
          .toString()
      }))
    }
  }

  async getTradingVolumeHistory(network: Network, from: number, to: number): Promise<ValueAt[]> {
    const fromDayUTC = Math.max(from - (from % 86400000), 1606953600000)
    const toDayUTC = to - (to % 86400000)

    if (network === Network.TERRA) {
      return this.terraStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)
    } else if (network === Network.ETH) {
      return this.ethStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)
    } else if (network === Network.BSC) {
      return this.bscStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)
    } else if (network === Network.COMBINE) {
      const terra = await this.terraStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)
      const eth = await this.ethStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)
      const bsc = await this.bscStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)

      return terra.map((data) => ({
        timestamp: data.timestamp,
        value: num(data.value)
          .plus(eth.find((ethData) => ethData.timestamp === data.timestamp)?.value || 0)
          .plus(bsc.find((bscData) => bscData.timestamp === data.timestamp)?.value || 0)
          .toString()
      }))
    }
  }

  async getAssetDayVolume(network: Network, token: string, timestamp: number): Promise<string> {
    const dayUTC = timestamp - (timestamp % 86400000)

    if (network === Network.TERRA) {
      return this.terraStatisticService.getAssetDayVolume(token, dayUTC)
    } else if (network === Network.ETH) {
      return this.ethStatisticService.getAssetDayVolume(token, dayUTC)
    } else if (network === Network.BSC) {
      return this.bscStatisticService.getAssetDayVolume(token, dayUTC)
    } else if (network === Network.COMBINE) {
      const statistics = [
        await this.terraStatisticService.getAssetDayVolume(token, dayUTC),
        await this.ethStatisticService.getAssetDayVolume(token, dayUTC),
        await this.bscStatisticService.getAssetDayVolume(token, dayUTC),
      ]

      return statistics.reduce((result, stat) => result.plus(stat), num(0)).toString()
    }
  }

  async getAsset24h(network: Network, token: string): Promise<{ volume: string; transactions: string }> {
    if (network === Network.TERRA) {
      return this.terraStatisticService.getAsset24h(token)
    } else if (network === Network.ETH) {
      return this.ethStatisticService.getAsset24h(token)
    } else if (network === Network.BSC) {
      return this.bscStatisticService.getAsset24h(token)
    } else if (network === Network.COMBINE) {
      const statistics = [
        await this.terraStatisticService.getAsset24h(token),
        await this.ethStatisticService.getAsset24h(token),
        await this.bscStatisticService.getAsset24h(token),
      ]

      return {
        volume: statistics.reduce((result, stat) => result.plus(stat.volume), num(0)).toString(),
        transactions: statistics.reduce((result, stat) => result.plus(stat.transactions), num(0)).toString(),
      }
    }
  }

  async getAssetLiquidity(network: Network, token: string): Promise<string> {
    if (network === Network.TERRA) {
      return this.terraStatisticService.getAssetLiquidity(token)
    } else if (network === Network.ETH) {
      const asset = await this.ethService.getAsset(token)

      return this.ethStatisticService.getAssetLiquidity(asset?.pair)
    } else if (network === Network.BSC) {
      const asset = await this.bscService.getAsset(token)

      return this.bscStatisticService.getAssetLiquidity(asset?.pair)
    } else if (network === Network.COMBINE) {
      const ethAsset = await this.ethService.getAsset(token)
      const bscAsset = await this.bscService.getAsset(token)
      const statistics = [
        await this.terraStatisticService.getAssetLiquidity(token),
        await this.ethStatisticService.getAssetLiquidity(ethAsset?.pair),
        await this.bscStatisticService.getAssetLiquidity(bscAsset?.pair),
      ]

      return statistics.reduce((result, stat) => result.plus(stat), num(0)).toString()
    }
  }

  async getAssetAPR(network: Network, token: string): Promise<string> {
    if (network === Network.TERRA) {
      return this.terraStatisticService.getAssetAPR(token)
    } else if (network === Network.ETH) {
      return this.ethStatisticService.getAssetAPR(token)
    }
  }

  async getAssetAPY(network: Network, token: string): Promise<string> {
    if (network === Network.TERRA) {
      return aprToApy(await this.terraStatisticService.getAssetAPR(token))
    } else if (network === Network.ETH) {
      return aprToApy(await this.ethStatisticService.getAssetAPR(token))
    }
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
