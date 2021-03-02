import * as bluebird from 'bluebird'
import memoize from 'memoizee-decorator'
import { Repository, getConnection } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Container, Service, Inject } from 'typedi'
import { num, aprToApy } from 'lib/num'
import { getTokenBalance } from 'lib/mirror'
import { getContractStore } from 'lib/terra'
import { getMethMirTokenBalance } from 'lib/meth'
import {
  GovService,
  AssetService,
  AccountService,
  PriceService,
  OracleService,
  ContractService,
  TerraStatisticService,
  EthStatisticService,
} from 'services'
import { DailyStatisticEntity, RewardEntity } from 'orm'
import { Statistic, PeriodStatistic, ValueAt, AccountBalance } from 'graphql/schema'
import { ContractType, Network, AssetStatus } from 'types'

@Service()
export class StatisticService {
  constructor(
    @Inject((type) => GovService) private readonly govService: GovService,
    @Inject((type) => AssetService) private readonly assetService: AssetService,
    @Inject((type) => AccountService) private readonly accountService: AccountService,
    @Inject((type) => OracleService) private readonly oracleService: OracleService,
    @Inject((type) => PriceService) private readonly priceService: PriceService,
    @Inject((type) => ContractService) private readonly contractService: ContractService,
    @Inject((type) => TerraStatisticService) private readonly terraStatisticService: TerraStatisticService,
    @Inject((type) => EthStatisticService) private readonly ethStatisticService: EthStatisticService,
    @InjectRepository(DailyStatisticEntity)
    private readonly dailyRepo: Repository<DailyStatisticEntity>,
    @InjectRepository(RewardEntity) private readonly rewardRepo: Repository<RewardEntity>
  ) {}

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async statistic(network: Network): Promise<Partial<Statistic>> {
    const assets = await this.assetService.getAll()
    const gov = this.govService.get()
    const mintContract = await this.contractService.get({ type: ContractType.MINT, gov })
    let assetMarketCap = num(0)
    let totalValueLocked = num(0)
    let collateralValue = num(0)

    await bluebird.map(assets, async (asset) => {
      if (asset.token === 'uusd') {
        const { balance } = await this.accountService.getBalance(mintContract.address, 'uusd')
        totalValueLocked = totalValueLocked.plus(balance)
        collateralValue = collateralValue.plus(balance)
        return
      }

      // add liquidity value to tvl
      const liquidity = await this.getAssetLiquidity(Network.COMBINE, asset.token)
      totalValueLocked = totalValueLocked.plus(liquidity)

      const price = await this.oracleService.getPrice(asset.token)
      if (!price) return

      // add asset market cap
      assetMarketCap = assetMarketCap.plus(num(asset.positions.mint).multipliedBy(price))

      // add collateral value to tvl
      const balance = await getTokenBalance(asset.token, mintContract.address)
      const collateral = num(balance).multipliedBy(price)
      totalValueLocked = totalValueLocked.plus(collateral)
      collateralValue = collateralValue.plus(collateral)
    })
    // add MIR gov staked value to tvl
    const mirBalance = await getTokenBalance(gov.mirrorToken, gov.gov)
    const mirPrice = await this.priceService.getPrice(gov.mirrorToken)
    if (mirPrice && mirBalance) {
      totalValueLocked = totalValueLocked.plus(num(mirBalance).multipliedBy(mirPrice))
    }

    return {
      network,
      assetMarketCap: assetMarketCap.toFixed(0),
      totalValueLocked: totalValueLocked.toFixed(0),
      collateralRatio: collateralValue.dividedBy(assetMarketCap).toFixed(4),
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

  async today(network: Network): Promise<PeriodStatistic> {
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
        activeUsers: num(terra.activeUsers).plus(eth.activeUsers).toString(),
      }
    }
  }

  async latest24h(network: Network): Promise<PeriodStatistic> {
    if (network === Network.TERRA) {
      return this.terraStatisticService.latest24h()
    } else if (network === Network.ETH) {
      return this.ethStatisticService.latest24h()
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

  async getFeeHistory(network: Network, from: number, to: number): Promise<ValueAt[]> {
    const fromDayUTC = Math.max(from - (from % 86400000), 1606953600000)
    const toDayUTC = to - (to % 86400000)
    let values = []

    if (network === Network.TERRA) {
      values = await this.terraStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)
    } else if (network === Network.ETH) {
      values = await this.ethStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)
    } else if (network === Network.COMBINE) {
      const terra = await this.terraStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)
      const eth = await this.ethStatisticService.getTradingVolumeHistory(fromDayUTC, toDayUTC)

      values = terra.map((data) => ({
        timestamp: data.timestamp,
        value: num(data.value)
          .plus(eth.find((ethData) => ethData.timestamp === data.timestamp)?.value || 0)
          .toString()
      }))
    }

    return values.map((data) => ({
      timestamp: data.timestamp,
      value: num(data.value).multipliedBy(0.003).toFixed(0)
    }))
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
      return this.ethStatisticService.getAssetLiquidity(token)
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
