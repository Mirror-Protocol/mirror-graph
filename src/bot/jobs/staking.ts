import * as bluebird from 'bluebird'
import { Coins, StdFee } from '@terra-money/terra.js'
import { TxWallet, getLatestBlockHeight } from 'lib/terra'
import { getStakingConfig, getStakingPool } from 'lib/mirror'
import * as logger from 'lib/logger'
import { Updater } from 'lib/Updater'
import { govService, assetService } from 'services'
import { AssetStatus } from 'types'

const updater = new Updater(5 * 60000) // 5mins

export async function adjustPremium(wallet: TxWallet): Promise<void> {
  if (!updater.needUpdate(Date.now())) {
    return
  }

  const latestHeight = await getLatestBlockHeight()
  if (!latestHeight) return

  const { staking } = govService().get()
  const { premiumMinUpdateInterval } = await getStakingConfig(staking)

  const listeds = await assetService().getAll({ where: { status: AssetStatus.LISTED } })
  if (listeds && listeds.length > 0) {
    const assetTokens = await bluebird
      .filter(listeds, (listed) => listed.symbol !== 'MIR' && listed.symbol !== 'uusd')
      .map((listed) => listed.token)
      .filter(async (token) => {
        const pool = await getStakingPool(staking, token)
        return (
          !pool.premiumUpdatedTime ||
          pool.premiumUpdatedTime == 0 ||
          latestHeight >= pool.premiumUpdatedTime + premiumMinUpdateInterval
        )
      })

    if (assetTokens && assetTokens.length > 0) {
      const gas = 300_000 + 20_000 * (assetTokens.length - 1)
      await wallet.execute(
        staking,
        { adjustPremium: { assetTokens: assetTokens } },
        new Coins([]),
        new StdFee(3_500_000, { uusd: gas })
        //new StdFee(3500000, { uusd: 550000 })
      )

      logger.info(
        `> adjust premium count: ${assetTokens.length}, assets: ${JSON.stringify(assetTokens)}`
      )
    }
  }
}
