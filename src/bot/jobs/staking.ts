import * as bluebird from 'bluebird'
import { Not, In } from 'typeorm'
import { Coins, StdFee } from '@terra-money/terra.js'
import { TxWallet, getLatestBlockHeight } from 'lib/terra'
import { getStakingConfig, getStakingPool } from 'lib/mirror'
import * as logger from 'lib/logger'
import { Updater } from 'lib/Updater'
import { govService, assetService } from 'services'

const updater = new Updater(60000) // 1min

export async function adjustPremium(wallet: TxWallet): Promise<void> {
  if (!updater.needUpdate(Date.now())) {
    return
  }

  const latestHeight = await getLatestBlockHeight()
  if (!latestHeight) return

  const { staking } = govService().get()
  const { premiumMinUpdateInterval } = await getStakingConfig(staking)

  const blacklist = ['MIR', 'uusd']
  const assets = await assetService().getListedAssets({ symbol: Not(In(blacklist)) })
  const tokens = await bluebird
    .map(assets, (asset) => asset.token)
    .filter(async (token) => {
      const pool = await getStakingPool(staking, token)
      return (
        !pool.premiumUpdatedTime ||
        pool.premiumUpdatedTime == 0 ||
        latestHeight >= pool.premiumUpdatedTime + premiumMinUpdateInterval
      )
    })

  if (tokens.length < 1) {
    return
  }

  const gas = 300_000 + 20_000 * (tokens.length - 1)
  await wallet.execute(
    staking,
    { adjustPremium: { assetTokens: tokens } },
    new Coins([]),
    new StdFee(3_500_000, { uusd: gas })
    //new StdFee(3500000, { uusd: 550000 })
  )

  logger.info(
    `> adjust premium count: ${tokens.length}, assets: ${JSON.stringify(tokens)}`
  )
}
