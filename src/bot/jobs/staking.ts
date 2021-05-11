import * as bluebird from 'bluebird'
import { Coins, StdFee } from '@terra-money/terra.js'
import { TxWallet, getLatestBlockHeight } from 'lib/terra'
import { getStakingConfig, getStakingPool } from 'lib/mirror'
import * as logger from 'lib/logger'
import { toSnakeCase } from 'lib/caseStyles'
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
  logger.info(`listed assets count: ${listeds.length}`)
  if (listeds && listeds.length > 0) {
    const assetTokens = await bluebird
      .map(listeds, (listed) => listed.token)
      .filter(async (token) => {
        const pool = await getStakingPool(staking, token)
        logger.info(`ready to adjust premium asset(${token}) latestHeight: ${latestHeight}, 
          premiumUpdatedTime: ${pool.premiumUpdatedTime}, premiumMinUpdateInterval: ${premiumMinUpdateInterval} `)

        return (
          !pool.premiumUpdatedTime ||
          pool.premiumUpdatedTime == 0 ||
          latestHeight <= pool.premiumUpdatedTime + premiumMinUpdateInterval
        )
      })

    if (assetTokens && assetTokens.length > 0) {
      logger.info(
        `assetTokens: ${JSON.stringify(
          toSnakeCase({ adjustPremium: { assetTokens: assetTokens } })
        )}`
      )
      await wallet.execute(
        staking,
        { adjustPremium: { assetTokens: assetTokens } },
        new Coins([]),
        new StdFee(30000000 - 1, { uusd: 30000000 - 1 })
      )

      logger.info(
        `> adjust premium count: ${assetTokens.length}, assets: ${JSON.stringify(assetTokens)}`
      )
    }
  }
}
