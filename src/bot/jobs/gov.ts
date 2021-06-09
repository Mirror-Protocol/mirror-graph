import * as bluebird from 'bluebird'
import { errorHandler } from 'lib/error'
import { TxWallet, getLatestBlockHeight } from 'lib/terra'
import { getGovPolls, getGovConfig } from 'lib/mirror'
import * as logger from 'lib/logger'
import { govService } from 'services'
import { Updater } from 'lib/Updater'

const updater = new Updater(60000) // 1min

export async function updatePolls(wallet: TxWallet): Promise<void> {
  if (!updater.needUpdate(Date.now())) {
    return
  }

  const latestHeight = await getLatestBlockHeight()
  if (!latestHeight) return

  const { gov } = govService().get()
  const { effectiveDelay, snapshotPeriod, expirationPeriod } = await getGovConfig(gov)

  let polls = await getGovPolls(gov, 'in_progress', 100)
  await bluebird.mapSeries(polls, async (poll) => {
    const { id: pollId, endHeight, stakedAmount } = poll

    if (latestHeight > endHeight) { // end poll
      await wallet.execute(gov, { endPoll: { pollId } })

      logger.info(`end poll(${pollId})`)
    } else if (!stakedAmount && snapshotPeriod) { // snapshot poll
      const snapHeight = endHeight - snapshotPeriod
      if (latestHeight > snapHeight) {
        await wallet.execute(gov, { snapshotPoll: { pollId } })

        logger.info(`snapshot poll(${pollId})`)
      }
    }
  })

  polls = (await getGovPolls(gov, 'passed', 100)).filter((poll) => poll.executeData)
  await bluebird.mapSeries(polls, async (poll) => {
    const executeHeight = poll.endHeight + effectiveDelay

    if (latestHeight > executeHeight && latestHeight - executeHeight < expirationPeriod) {
      await wallet.execute(gov, { executePoll: { pollId: poll.id } }).catch(errorHandler)

      logger.info(`execute poll(${poll.id})`)
    }
  })

  logger.info('gov polls updated')
}
