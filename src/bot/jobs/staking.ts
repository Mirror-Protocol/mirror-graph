import { TxWallet, getLatestBlockHeight } from 'lib/terra'
import { getStakingConfig } from 'lib/mirror'
import * as logger from 'lib/logger'
import { govService, assetService } from 'services'
import { Updater } from 'lib/Updater'
import { AssetStatus } from 'types'

const updater = new Updater(5 * 60000) // 5mins
let lastAdjustPremiumHeight = -1

export async function adjustPremium(wallet: TxWallet): Promise<void> {
  if (!updater.needUpdate(Date.now())) {
    return
  }

  const latestHeight = await getLatestBlockHeight()
  if (!latestHeight) return

  const { staking } = govService().get()
  const { premiumMinUpdateInterval /*, expirationPeriod*/ } = await getStakingConfig(staking)

  const nextAdjustPremiumHeight = lastAdjustPremiumHeight + premiumMinUpdateInterval
  if (latestHeight < nextAdjustPremiumHeight && lastAdjustPremiumHeight !== -1) return

  const assets = await assetService().getAll({ where: { status: AssetStatus.LISTED } })
  if (assets) {
    await wallet.execute(staking, { adjustPremium: { assetTokens: assets } })
    lastAdjustPremiumHeight = latestHeight
    logger.info('Adjust premium')
  }
}
