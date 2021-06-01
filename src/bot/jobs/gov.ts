import * as bluebird from 'bluebird'
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
  const { effectiveDelay, snapshotPeriod } = await getGovConfig(gov)

  let polls = await getGovPolls(gov, 'in_progress', 100)
  await bluebird.mapSeries(polls, async (poll) => {
    // end poll
    if (latestHeight > poll.endHeight) {
      await wallet.execute(gov, { endPoll: { pollId: poll.id } })

      logger.info(`end poll(${poll.id})`)
    }
    // snapshot poll
    else if (poll.stakedAmount == null && snapshotPeriod) {
      const snapHeight = poll.endHeight - snapshotPeriod
      if (latestHeight > snapHeight) {
        await wallet.execute(gov, { snapshotPoll: { pollId: poll.id } })

        logger.info(`snapshot poll(${poll.id})`)
      }
    }
  })

  polls = (await getGovPolls(gov, 'passed', 100)).filter((poll) => poll.executeData)
  await bluebird.mapSeries(polls, async (poll) => {
    // execute poll
    const executeHeight = poll.endHeight + effectiveDelay
    // try execute only 1 hour(600 blocks)
    if (latestHeight > executeHeight && latestHeight - executeHeight < 10 * 60) {
      await wallet.execute(gov, { executePoll: { pollId: poll.id } })

      logger.info(`execute poll(${poll.id})`)
    }
  })

  logger.info('gov polls updated')
}
