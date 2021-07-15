import * as bluebird from 'bluebird'
import { Not, In } from 'typeorm'
import { Coins, StdFee } from '@terra-money/terra.js'
import { TxWallet, getGasAmount } from 'lib/terra'
import { getStakingConfig, getStakingPool } from 'lib/mirror'
import * as logger from 'lib/logger'
import { Updater } from 'lib/Updater'
import { govService, assetService } from 'services'

const updater = new Updater(60000) // 1min

export async function adjustPremium(wallet: TxWallet): Promise<void> {
  const now = Date.now()
  if (!updater.needUpdate(now)) {
    return
  }

  const { staking } = govService().get()
  const { premiumMinUpdateInterval } = await getStakingConfig(staking)

  const blacklist = ['MIR', 'uusd']
  const assets = await assetService().getListedAssets({ symbol: Not(In(blacklist)) })

  const assetTokens = await bluebird
    .map(assets, (asset) => asset.token)
    .filter(async (token) => {
      const pool = await getStakingPool(staking, token)
      return (
        !pool.premiumUpdatedTime ||
        pool.premiumUpdatedTime == 0 ||
        now > ((pool.premiumUpdatedTime + premiumMinUpdateInterval + 10) * 1000)
      )
    })

  if (assetTokens.length < 1) {
    return
  }

  const gas = 300000 * assetTokens.length
  await wallet.execute(
    staking,
    { adjustPremium: { assetTokens } },
    new Coins([]),
    new StdFee(gas, getGasAmount(gas, 'uusd'))
  )

  logger.info(`premium adjusted ${assetTokens.length} assets`)
}
