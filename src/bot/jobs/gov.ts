import * as bluebird from 'bluebird'
import { errorHandler } from 'lib/error'
import { TxWallet } from 'lib/terra'
import { getGovPolls, getGovConfig } from 'lib/mirror'
import * as logger from 'lib/logger'
import { govService } from 'services'
import { Updater } from 'lib/Updater'

const updater = new Updater(60000) // 1min

export async function updatePolls(wallet: TxWallet): Promise<void> {
  const now = Date.now()
  if (!updater.needUpdate(Date.now())) {
    return
  }

  const { gov } = govService().get()
  const { effectiveDelay, snapshotPeriod, expirationPeriod } = await getGovConfig(gov)

  let polls = await getGovPolls(gov, 'in_progress', 100)
  await bluebird.mapSeries(polls, async (poll) => {
    const { id: pollId, endTime, stakedAmount } = poll

    if (now > endTime * 1000) { // end poll
      await wallet.execute(gov, { endPoll: { pollId } })

      logger.info(`end poll(${pollId})`)
    } else if (!stakedAmount && snapshotPeriod) { // snapshot poll
      const snapshotTime = endTime - snapshotPeriod
      if (now > snapshotTime) {
        await wallet.execute(gov, { snapshotPoll: { pollId } })

        logger.info(`snapshot poll(${pollId})`)
      }
    }
  })

  polls = (await getGovPolls(gov, 'passed', 100)).filter((poll) => poll.executeData)
  await bluebird.mapSeries(polls, async (poll) => {
    const executeTime = (poll.endTime + effectiveDelay) * 1000

    if (now > executeTime && now - executeTime < expirationPeriod) {
      await wallet.execute(gov, { executePoll: { pollId: poll.id } }).catch(errorHandler)

      logger.info(`execute poll(${poll.id})`)
    }
  })

  logger.info('gov polls updated')
}
