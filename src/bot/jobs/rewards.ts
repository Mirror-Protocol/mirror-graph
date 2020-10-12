import * as bluebird from 'bluebird'
import { Coins, MsgExecuteContract } from '@terra-money/terra.js'
import { TxWallet } from 'lib/terra'
import { toSnakeCase } from 'lib/caseStyles'
import * as logger from 'lib/logger'
import { getTokenBalance, getStakingPool } from 'lib/mirror'
import { govService, assetService } from 'services'
import { num } from 'lib/num'

export async function distributeRewards(wallet: TxWallet): Promise<void> {
  const { factory, collector, staking } = govService().get()
  const assets = await assetService().getAll({ where: { isListed: true }})
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
  await wallet.executeMsgs(msgs)

  // owner commission
  const convertMsgs = await bluebird
    .map(assets, async (asset) => {
      const balance = await getTokenBalance(asset.token, collector)

      if (num(balance).isGreaterThan(10000)) {
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
