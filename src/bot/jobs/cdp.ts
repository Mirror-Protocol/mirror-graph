import { getRepository } from 'typeorm'
import * as logger from 'lib/logger'
import { cdpService } from 'services'
import { CdpEntity } from 'orm'
import { Updater } from 'lib/Updater'

const updater = new Updater(60000) // 1min

async function removeClosedCdps(): Promise<void> {
  const closedCdps = await cdpService().getAll({
    select: ['id'], where: { mintAmount: 0, collateralAmount: 0 }
  })

  await getRepository(CdpEntity).remove(closedCdps)
}

export async function updateCdps(): Promise<void> {
  if (!updater.needUpdate(Date.now())) {
    return
  }

  await removeClosedCdps()

  await cdpService().calculateCollateralRatio()

  logger.info('cdp ratio updated')
}
