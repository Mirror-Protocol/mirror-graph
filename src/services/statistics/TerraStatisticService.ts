import * as bluebird from 'bluebird'
import memoize from 'memoizee-decorator'
import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Container, Service, Inject } from 'typedi'
import { getTokenBalance } from 'lib/mirror'
import { getContractStore } from 'lib/terra'
import { getMethMirTokenBalance } from 'lib/eth'
import { num } from 'lib/num'
import {
  GovService, AssetService, AccountService, PriceService, OracleService, ContractService
} from 'services'
import { DailyStatisticEntity, TxEntity, RewardEntity } from 'orm'
import { ContractType } from 'types'
import { PeriodStatistic, ValueAt, Statistic } from 'graphql/schema'

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
    @InjectRepository(RewardEntity) private readonly rewardRepo: Repository<RewardEntity>
  ) {}

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async statistic(): Promise<Partial<Statistic>> {
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
      const liquidity = await this.getAssetLiquidity(asset.token)
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

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
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

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
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

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
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

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
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

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
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

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
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

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async getAssetLiquidity(token: string): Promise<string> {
    const asset = await this.assetService.get({ token })
    const price = await this.priceService.getPrice(token)
    if (!asset || !price) {
      return '0'
    }
    return num(asset.positions.uusdPool).dividedBy(asset.positions.pool).multipliedBy(asset.positions.pool)
      .plus(asset.positions.uusdPool)
      .toFixed(0)
  }

  @memoize({ promise: true, maxAge: 60000 * 10 }) // 10 minutes
  async getAssetAPR(token: string): Promise<string> {
    const asset = await this.assetService.get({ token })
    const { mirrorToken } = this.govService.get()

    const mirPrice = await this.priceService.getPrice(mirrorToken)
    const positions = asset.positions
    const liquidityValue = num(positions.uusdPool)
      .dividedBy(positions.pool)
      .multipliedBy(positions.pool)
      .plus(asset.positions.uusdPool)

    const from = Date.now() - (60000 * 60 * 24) // 24h ago
    const to = Date.now()
    const reward24h = (
      await this.rewardRepo
        .createQueryBuilder()
        .select('sum(amount)', 'amount')
        .where(
          'datetime BETWEEN to_timestamp(:from) AND to_timestamp(:to)',
          { from: Math.floor(from / 1000), to: Math.floor(to / 1000) }
        )
        .andWhere('token = :token', { token })
        .andWhere('is_gov_reward = false')
        .getRawOne()
    )?.amount || '0'
    const mirValue = num(reward24h).multipliedBy(mirPrice).multipliedBy(365)

    const poolValue = liquidityValue.multipliedBy(
      num(asset.positions.lpStaked).dividedBy(asset.positions.lpShares)
    )

    // (24h MIR reward * MIR price * 365) / (liquidity value * (staked lp share/total lp share))
    const apr = mirValue.dividedBy(poolValue)

    return apr.isNaN() ? '0' : apr.toString()
  }
}

export function terraStatisticService(): TerraStatisticService {
  return Container.get(TerraStatisticService)
}
