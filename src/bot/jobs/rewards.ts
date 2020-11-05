import * as bluebird from 'bluebird'
import { Coins, MsgExecuteContract } from '@terra-money/terra.js'
import { TxWallet } from 'lib/terra'
import { toSnakeCase } from 'lib/caseStyles'
import * as logger from 'lib/logger'
import { getTokenBalance, getStakingPool } from 'lib/mirror'
import { govService, assetService } from 'services'
import { AssetStatus } from 'types'
import { num } from 'lib/num'
import { Updater } from 'lib/Updater'

const updater = new Updater(60 * 60000) // 1hour

export async function distributeRewards(wallet: TxWallet): Promise<void> {
  if (!updater.needUpdate(Date.now())) {
    return
  }

  const { factory, collector, staking } = govService().get()
  const assets = await assetService().getAll({ where: { status: AssetStatus.LISTING }})
  const sender = wallet.key.accAddress
  
  // MIR inflation
  const msgs = await bluebird
    .map(assets, async (asset) => {
      const pool = await getStakingPool(staking, asset.token)

      if (num(pool.totalBondAmount).isGreaterThan(0)) {
        return new MsgExecuteContract(
          sender, factory, toSnakeCase({ mint: { assetToken: asset.token } }), new Coins([])
        )
      }
    })
    .filter(Boolean)

  // execute distribute inflation
  if (msgs.length > 0) {
    await wallet.executeMsgs(msgs)
  }

  // owner commission
  const convertMsgs = await bluebird
    .map(assets, async (asset) => {
      const balance = await getTokenBalance(asset.token, collector)

      if (num(balance).isGreaterThan(1000)) {
        return new MsgExecuteContract(
          sender, collector, toSnakeCase({ convert: { assetToken: asset.token } }), new Coins([])
        )
      }
    })
    .filter(Boolean)

  if (convertMsgs.length > 0) {
    // execute convert owner commission
    await wallet.executeMsgs(convertMsgs)

    // execute distribute converted owner commission
    await wallet.execute(collector, { send: {} })
  }

  logger.info('rewards distributed')
}
