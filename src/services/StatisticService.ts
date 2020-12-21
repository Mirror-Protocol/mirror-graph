import { addDays } from 'date-fns'
import * as bluebird from 'bluebird'
import * as memoizee from 'memoizee'
import { Repository, getConnection } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Container, Service, Inject } from 'typedi'
import { num } from 'lib/num'
import { getTokenBalance } from 'lib/mirror'
import { getContractStore } from 'lib/terra'
import { getMethMirTokenBalance } from 'lib/meth'
import { getMIRAnnualRewards } from 'lib/utils'
import { GovService, AssetService, PriceService, OracleService, ContractService } from 'services'
import { DailyStatisticEntity, TxEntity, RewardEntity } from 'orm'
import { Statistic, Latest24h, ValueAt, AccountBalance } from 'graphql/schema'
import { ContractType } from 'types'

async function fetchMirTokenSupply(
  mirrorToken: string, airdropContract: string, factoryContract: string, communityContract: string
): Promise<{ mirTotalSupply: string; mirCirculatingSupply: string }> {
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

export const getMethMirTokenSupply = memoizee(fetchMirTokenSupply, {
  promise: true, maxAge: 1000 * 60 * 10, // 10 minutes
})

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

  async statistic(): Promise<Partial<Statistic>> {
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
      assetMarketCap: assetMarketCap.toFixed(0),
      totalValueLocked: totalValueLocked.toFixed(0),
      collateralRatio: totalValueLocked.dividedBy(assetMarketCap).multipliedBy(100).toFixed(2),
      ...await this.mirSupply()
    }
  }

  async mirSupply(): Promise<Partial<Statistic>> {
    const gov = this.govService.get()
    const mirrorToken = gov.mirrorToken
    const airdropContract = (await this.contractService.get({ type: ContractType.AIRDROP, gov })).address
    const factoryContract = (await this.contractService.get({ type: ContractType.FACTORY, gov })).address
    const communityContract = (await this.contractService.get({ type: ContractType.COMMUNITY, gov })).address

    return getMethMirTokenSupply(mirrorToken, airdropContract, factoryContract, communityContract)
  }

  async latest24h(): Promise<Latest24h> {
    const now = Date.now()
    const before24h = addDays(now, -1).getTime()
    const before7d = addDays(now, -7).getTime()
    const before48h = addDays(now, -2).getTime()

    const txs = await this.txRepo
      .createQueryBuilder()
      .select('count(id)', 'count')
      .addSelect('sum(commission_value)', 'commission')
      .addSelect('sum(volume)', 'volume')
      .where('datetime BETWEEN :from AND :to', { from: new Date(before24h), to: new Date(now) })
      .getRawOne()

    const mir = await this.txRepo
      .createQueryBuilder()
      .select('sum(volume)', 'volume')
      .where('datetime BETWEEN :from AND :to', { from: new Date(before24h), to: new Date(now) })
      .andWhere('token = :token', { token: this.govService.get().mirrorToken })
      .getRawOne()

    const volume48h =
      (
        await this.txRepo
          .createQueryBuilder()
          .select('sum(volume)', 'volume')
          .where('datetime BETWEEN :from AND :to', {
            from: new Date(before48h),
            to: new Date(before24h),
          })
          .getRawOne()
      )?.volume || '0'

    const volume = txs?.volume || '0'
    const volumeChanged =
      volume48h !== '0' && volume !== '0'
        ? num(volume).minus(volume48h).dividedBy(volume48h).multipliedBy(100).toFixed(2)
        : '0'

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
    const govAPR = num(govReward7d)
      .dividedBy(7)
      .multipliedBy(365)
      .dividedBy(govStakedMir)

    return {
      transactions: txs?.count || '0',
      volume,
      volumeChanged,
      feeVolume: txs?.commission || '0',
      mirVolume: mir?.volume || '0',
      govAPR: !govAPR.isNaN() ? govAPR.toString() : '0',
    }
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

  async getLiquidityHistory(from: number, to: number): Promise<ValueAt[]> {
    return this.dailyRepo
      .createQueryBuilder()
      .select('datetime', 'timestamp')
      .addSelect('cumulative_liquidity', 'value')
      .where('datetime BETWEEN :from AND :to', { from: new Date(from), to: new Date(to) })
      .orderBy('datetime', 'ASC')
      .getRawMany()
  }

  async getTradingVolumeHistory(from: number, to: number): Promise<ValueAt[]> {
    return this.dailyRepo
      .createQueryBuilder()
      .select('datetime', 'timestamp')
      .addSelect('trading_volume', 'value')
      .where('datetime BETWEEN :from AND :to', { from: new Date(from), to: new Date(to) })
      .orderBy('datetime', 'ASC')
      .getRawMany()
  }

  async getAssetTradingVolume24h(token: string): Promise<string> {
    const to = Date.now()
    const from = addDays(to, -1).getTime()

    const txs24h = await this.txRepo
      .createQueryBuilder()
      .select('sum(volume)', 'volume')
      .where('datetime BETWEEN :from AND :to', { from: new Date(from), to: new Date(to) })
      .andWhere('token = :token', { token })
      .getRawOne()

    return txs24h?.volume || '0'
  }

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
      .from((subQuery) => (subQuery
        .select('DISTINCT ON (address) address, balance')
        .from('balance', 'balance')
        .where('token = :token', { token })
        .orderBy('address')
        .addOrderBy('id', 'DESC')
      ), 'b')
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
