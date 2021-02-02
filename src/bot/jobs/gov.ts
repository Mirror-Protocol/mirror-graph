import * as bluebird from 'bluebird'
import { TxWallet, getLatestBlockHeight } from 'lib/terra'
import { getGovPolls, getGovConfig } from 'lib/mirror'
import * as logger from 'lib/logger'
import { govService } from 'services'
import { Updater } from 'lib/Updater'

const updater = new Updater(5 * 60000) // 5mins

export async function updatePolls(wallet: TxWallet): Promise<void> {
  if (!updater.needUpdate(Date.now())) {
    return
  }

  const latestHeight = await getLatestBlockHeight()
  if (!latestHeight)
    return

  const { gov } = govService().get()
  const { /*effectiveDelay, */expirationPeriod } = await getGovConfig(gov)

  // collect ended poll
  let polls = await getGovPolls(gov, 'in_progress', 100)
  await bluebird.mapSeries(polls, async (poll) => {
    if (latestHeight > poll.endHeight) {
      await wallet.execute(gov, { endPoll: { pollId: poll.id } })

      logger.info(`end poll id: ${poll.id}`)
    }
  })

  // collect execute needed
  polls = (await getGovPolls(gov, 'passed', 100))
    .filter((poll) => poll.executeData)

  await bluebird.mapSeries(polls, async (poll) => {
    // const executeHeight = poll.endHeight + effectiveDelay
    // try execute only 1 hour(600 blocks)
    // if (latestHeight > executeHeight && latestHeight - executeHeight < 10 * 60 ) {
    //   await wallet.execute(gov, { executePoll: { pollId: poll.id } })

    //   logger.info(`execute poll id: ${poll.id}`)
    // }

    // over expiration period, expire
    const expireHeight = poll.endHeight + expirationPeriod
    if (latestHeight > expireHeight) {
      await wallet.execute(gov, { expirePoll: { pollId: poll.id } })

      logger.info(`expire poll id: ${poll.id}`)
    }
  })

  logger.info('gov polls updated')
}
