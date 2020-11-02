import { getRepository } from 'typeorm'
import * as bluebird from 'bluebird'
import { errorHandler } from 'lib/error'
import * as logger from 'lib/logger'
import { getLatestBlockHeight } from 'lib/terra'
import { getPairPool, getTokenBalance } from 'lib/mirror'
import { assetService } from 'services'
import { BlockEntity, AssetPositionsEntity, BalanceEntity } from 'orm'
import { AssetStatus } from 'types'
import config from 'config'

export async function getCollectedHeight(): Promise<number> {
  const latestBlockFromDB = await getRepository(BlockEntity)
    .findOne({ chainId: config.TERRA_CHAIN_ID }, { order: { id: 'DESC' } })

  return latestBlockFromDB?.height
}

async function adjustPool(): Promise<void> {
  const assets = await assetService().getAll({ where: { status: AssetStatus.LISTING }})
  await bluebird.map(assets, async (asset) => {
    const pool = await getPairPool(asset.pair)

    if (asset.positions.pool !== pool.assetAmount) {
      logger.info(`adjust pool: ${asset.symbol}, ${asset.positions.pool} to ${pool.assetAmount}`)
      asset.positions.pool = pool.assetAmount
      await getRepository(AssetPositionsEntity).save(asset.positions)
    }
    if (asset.positions.uusdPool !== pool.collateralAmount) {
      logger.info(`adjust uusd pool: ${asset.symbol}, ${asset.positions.uusdPool} to ${pool.collateralAmount}`)
      asset.positions.uusdPool = pool.collateralAmount
      await getRepository(AssetPositionsEntity).save(asset.positions)
    }
  })
}

export async function adjustBalance(): Promise<void> {
// select distinct on (address, balance.token) address,balance.token,id,symbol, balance, average_price
// 	from balance join asset on balance.token = asset.token
// 	order by address, balance.token, balance.datetime desc;
  const balances = await getRepository(BalanceEntity)
    .createQueryBuilder()
    .select('DISTINCT ON (address, token) address', 'address')
    .addSelect('token')
    .addSelect('id')
    .addSelect('balance')
    .orderBy('address')
    .addOrderBy('token')
    .addOrderBy('id', 'DESC')
    .getRawMany()

  await bluebird.mapSeries(balances, async (row) => {
    const contractBalance = await getTokenBalance(row.token, row.address)
    if (row.balance !== contractBalance) {
      logger.info(
        `wrong balance - [${row.id}] address: ${row.address}, token: ${row.token},`,
        `db: ${row.balance}, contract: ${contractBalance}`
      )
    }
  })
}

export async function adjust(): Promise<void> {
  const latestHeight = await getLatestBlockHeight().catch(errorHandler)
  const collectedHeight = await getCollectedHeight()
  if (!latestHeight || !collectedHeight || latestHeight-collectedHeight > 1) {
    return
  }

  await adjustPool()
  await adjustBalance()
}
