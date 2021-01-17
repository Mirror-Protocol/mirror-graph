import { addDays } from 'date-fns'
import * as bluebird from 'bluebird'
import memoize from 'memoizee-decorator'
import { Repository, getConnection } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Container, Service, Inject } from 'typedi'
import { num } from 'lib/num'
import { getTokenBalance } from 'lib/mirror'
import { getContractStore } from 'lib/terra'
import { getMethMirTokenBalance } from 'lib/meth'
import {
  GovService, AssetService, OracleService, ContractService, TerraStatisticService, EthStatisticService,
} from 'services'
import { DailyStatisticEntity, RewardEntity } from 'orm'
import { Statistic, TodayStatistic, ValueAt, AccountBalance } from 'graphql/schema'
import { ContractType, Network } from 'types'

@Service()
export class StatisticService {
  constructor(
    @Inject((type) => GovService) private readonly govService: GovService,
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @Inject((type) => OracleService) private readonly oracleService: OracleService,
    @Inject((type) => ContractService) private readonly contractService: ContractService,
    @Inject((type) => TerraStatisticService) private readonly terraStatisticService: TerraStatisticService,
    @Inject((type) => EthStatisticService) private readonly ethStatisticService: EthStatisticService,
    @InjectRepository(DailyStatisticEntity)
    private readonly dailyRepo: Repository<DailyStatisticEntity>,
    @InjectRepository(RewardEntity) private readonly rewardRepo: Repository<RewardEntity>
  ) {}

  async statistic(network: Network): Promise<Partial<Statistic>> {
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

  async today(network: Network): Promise<TodayStatistic> {
    if (network === Network.TERRA) {
      return this.terraStatisticService.today()
    } else if (network === Network.ETH) {
      return this.ethStatisticService.today()
    } else if (network === Network.COMBINE) {
      const terra = await this.terraStatisticService.today()
      const eth = await this.ethStatisticService.today()

      return {
        transactions: num(terra.transactions).plus(eth.transactions).toString(),
        volume: num(terra.volume).plus(eth.volume).toString(),
        feeVolume: num(terra.feeVolume).plus(eth.feeVolume).toString(),
        mirVolume: num(terra.mirVolume).plus(eth.mirVolume).toString(),
      }
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
        liquidityValue = liquidityValue
          .plus(num(asset.positions.uusdPool).dividedBy(asset.positions.pool).multipliedBy(asset.positions.pool))
          .plus(asset.positions.uusdLiquidity)
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
    } else if (network === Network.COMBINE) {
      const terra = await this.terraStatisticService.getLiquidityHistory(fromDayUTC, toDayUTC)
      const eth = await this.ethStatisticService.getLiquidityHistory(fromDayUTC, toDayUTC)

      return terra.map((data) => ({
        timestamp: data.timestamp,
        value: num(data.value)
          .plus(eth.find((ethData) => ethData.timestamp === data.timestamp)?.value || 0)
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
    } else if (network === Network.COMBINE) {
      const terra = await this.terraStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)
      const eth = await this.ethStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)

      return terra.map((data) => ({
        timestamp: data.timestamp,
        value: num(data.value)
          .plus(eth.find((ethData) => ethData.timestamp === data.timestamp)?.value || 0)
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
    } else if (network === Network.COMBINE) {
      const terra = await this.terraStatisticService.getAssetDayVolume(token, dayUTC)
      const eth = await this.ethStatisticService.getAssetDayVolume(token, dayUTC)

      return num(terra).plus(eth).toString()
    }
  }

  async getAsset24h(network: Network, token: string): Promise<{ volume: string; transactions: string }> {
    if (network === Network.TERRA) {
      return this.terraStatisticService.getAsset24h(token)
    } else if (network === Network.ETH) {
      return this.ethStatisticService.getAsset24h(token)
    } else if (network === Network.COMBINE) {
      const terra = await this.terraStatisticService.getAsset24h(token)
      const eth = await this.ethStatisticService.getAsset24h(token)

      return {
        volume: num(terra.volume).plus(eth.volume).toString(),
        transactions: num(terra.transactions).plus(eth.transactions).toString(),
      }
    }
  }

  async getAssetLiquidity(network: Network, token: string): Promise<string> {
    if (network === Network.TERRA) {
      return this.terraStatisticService.getAssetLiquidity(token)
    } else if (network === Network.ETH) {
      const result = await this.ethStatisticService.getAssetLiquidity(token)
      console.log(token, result)
      return result
    } else if (network === Network.COMBINE) {
      const terra = await this.terraStatisticService.getAssetLiquidity(token)
      const eth = await this.ethStatisticService.getAssetLiquidity(token)

      return num(terra).plus(eth).toString()
    }
  }

  async getAssetAPR(network: Network, token: string): Promise<string> {
    if (network === Network.TERRA) {
      return this.terraStatisticService.getAssetAPR(token)
    } else if (network === Network.ETH) {
      return this.ethStatisticService.getAssetAPR(token)
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
