import { Coins, MsgExecuteContract } from '@terra-money/terra.js'
import { TxWallet } from 'lib/terra'
import { toSnakeCase } from 'lib/caseStyles'
import * as logger from 'lib/logger'
import { govService, assetService } from 'services'

export async function distributeRewards(wallet: TxWallet): Promise<void> {
  const { factory } = govService().get()

  const assets = await assetService().getAll({ where: { isListed: true }})
  const msgs = assets.map((asset) => new MsgExecuteContract(
    wallet.key.accAddress,
    factory,
    toSnakeCase({ mint: { assetToken: asset.token } }),
    new Coins([])
  ))

  await wallet.executeMsgs(msgs)

  logger.info('rewards distributed')
}
