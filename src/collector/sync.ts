import * as bluebird from 'bluebird'
import { getRepository } from 'typeorm'
import { getContractStoreWithHeight } from 'lib/terra'
import { PairPool } from 'lib/mirror'
import { assetService, govService } from 'services'
import { AssetPositionsEntity } from 'orm'

export async function getPairPool(targetHeight: number, pair: string):
  Promise<{ assetAmount: string; collateralAmount: string; totalShare: string }> {
  for (let i = 0; i < 5; i += 1) {
    const queryResult = await getContractStoreWithHeight<PairPool>(pair, { pool: {} })
    const { result: pool, height } = queryResult
    if (height !== targetHeight) {
      await bluebird.delay(200)
      continue
    }

    const token = pool?.assets?.find((asset) => asset.info['token'])
    const nativeToken = pool?.assets?.find((asset) => asset.info['nativeToken'])
    if (!token || !nativeToken) {
      return
    }

    return {
      assetAmount: token.amount,
      collateralAmount: nativeToken.amount,
      totalShare: pool.totalShare
    }
  }
}

export interface TokenInfo {
  decimals: string
  name: string
  symbol: string
  totalSupply: string
}

export async function getTokenInfo(targetHeight: number, token: string): Promise<TokenInfo> {
  for (let i = 0; i < 5; i += 1) {
    const queryResult = await getContractStoreWithHeight<TokenInfo>(token, { tokenInfo: {} })
    const { result, height } = queryResult
    if (height !== targetHeight) {
      await bluebird.delay(200)
      continue
    }

    return result
  }
}

export async function getTokenBalance(targetHeight: number, token: string, address: string): Promise<{ balance: string }> {
  for (let i = 0; i < 5; i += 1) {
    const queryResult = await getContractStoreWithHeight<{ balance: string }>(token, { balance: { address } })
    const { result, height } = queryResult
    if (height !== targetHeight) {
      await bluebird.delay(200)
      continue
    }

    return result
  }
}

export async function syncPairs(height: number): Promise<void> {
  const assets = await assetService().getListedAssets()
  const stakingContract = govService().get().staking

  await bluebird.map(assets, async (asset) => {
    const { lpToken } = asset
    let changed = false

    const pairPool = await getPairPool(height, asset.pair).catch(() => undefined)
    if (pairPool) {
      const { assetAmount, collateralAmount } = pairPool
      const { pool, uusdPool } = asset.positions

      if (assetAmount !== pool || collateralAmount !== uusdPool) {
        asset.positions.pool = assetAmount
        asset.positions.uusdPool = collateralAmount

        changed = true
      }
    }

    const tokenInfo = await getTokenInfo(height, lpToken).catch(() => undefined)
    if (tokenInfo && asset.positions.lpShares !== tokenInfo.totalSupply) {
      asset.positions.lpShares = tokenInfo.totalSupply

      changed = true
    }

    const tokenBalance = await getTokenBalance(height, lpToken, stakingContract).catch(() => undefined)
    if (tokenBalance && asset.positions.lpStaked !== tokenBalance.balance) {
      asset.positions.lpStaked = tokenBalance.balance

      changed = true
    }

    changed && await getRepository(AssetPositionsEntity).save(asset.positions)
  })
}
