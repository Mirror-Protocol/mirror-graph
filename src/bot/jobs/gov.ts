import { Coins, MsgExecuteContract } from '@terra-money/terra.js'
import { TxWallet, getLatestBlockHeight } from 'lib/terra'
import { getGovPolls, getGovConfig } from 'lib/mirror'
import { toSnakeCase } from 'lib/caseStyles'
import { errorHandler } from 'lib/error'
import * as logger from 'lib/logger'
import { govService } from 'services'

export async function updatePolls(wallet: TxWallet): Promise<void> {
  const { gov } = govService().get()
  const sender = wallet.key.accAddress
  const latestHeight = await getLatestBlockHeight().catch(errorHandler)
  const { effectiveDelay } = await getGovConfig(gov)
  const msgs = []

  // collect ended poll
  let polls = await getGovPolls(gov, 'in_progress', 100)
  polls.map((poll) => {
    if (latestHeight > poll.endHeight) {
      msgs.push(new MsgExecuteContract(
        sender, gov, toSnakeCase({ endPoll: { pollId: poll.id } }), new Coins([])
      ))

      logger.info(`end poll id: ${poll.id}`)
    }
  })

  // collect execute needed
  polls = await getGovPolls(gov, 'passed', 100)
  polls.map((poll) => {
    if (latestHeight > poll.endHeight + effectiveDelay) {
      msgs.push(new MsgExecuteContract(
        sender, gov, toSnakeCase({ executePoll: { pollId: poll.id } }), new Coins([])
      ))

      logger.info(`execute poll id: ${poll.id}`)
    }
  })

  if (msgs.length > 0) {
    await wallet.executeMsgs(msgs)
  }

  logger.info('gov polls updated')
}
