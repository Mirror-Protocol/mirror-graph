import { getRepository } from 'typeorm'
import * as logger from 'lib/logger'
import { num } from 'lib/num'
import { cdpService, oracleService } from 'services'
import { CdpEntity } from 'orm'

async function removeClosedCdps(): Promise<void> {
  const closedCdps = await cdpService().getAll({
    select: ['id'], where: { mintAmount: 0, collateralAmount: 0 }
  })

  await getRepository(CdpEntity).remove(closedCdps)
}

async function calculateCollateralRatio(): Promise<void> {
  const prices = await oracleService().getLatestPrices(Date.now())

  const cdps = await cdpService().getAll()

  await cdps.map((cdp) => {
    const { token, mintAmount, collateralToken, collateralAmount } = cdp
    const tokenPrice = prices[token]
    const collateralPrice = collateralToken !== 'uusd' ? prices[collateralToken] : '1'

    if (!tokenPrice || !collateralPrice)
      return

    const mintValue = num(tokenPrice).multipliedBy(mintAmount)
    const collateralValue = num(collateralPrice).multipliedBy(collateralAmount)
    if (mintValue.isLessThanOrEqualTo(0) || collateralValue.isLessThanOrEqualTo(0)) {
      cdp.collateralRatio = '0'
    } else {
      cdp.collateralRatio = collateralValue.dividedBy(mintValue).toString()
    }
  })

  await getRepository(CdpEntity).save(cdps)
}

export async function updateCdps(): Promise<void> {
  await removeClosedCdps()

  await calculateCollateralRatio()

  logger.info('cdp ratio updated')
}
