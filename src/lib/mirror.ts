import { getContractStore } from 'lib/terra'
import { PairPool } from 'types'

export async function getPairPool(pair: string):
  Promise<{assetAmount: string; collateralAmount: string; totalShare: string}> {
  const pool = await getContractStore<PairPool>(pair, { pool: {} })
  console.log(JSON.stringify(pool))
  const token = pool.assets.find((asset) => asset.info['token'])
  const nativeToken = pool.assets.find((asset) => asset.info['nativeToken'])

  return {
    assetAmount: token?.amount || '0',
    collateralAmount: nativeToken?.amount || '0',
    totalShare: pool.totalShare || '0'
  }
}
