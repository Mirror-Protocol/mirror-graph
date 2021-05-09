import { num } from 'lib/num'
import { govService } from 'services'
import { RewardEntity } from 'orm'
import { ParseArgs } from './parseArgs'

export async function parse(args: ParseArgs): Promise<void> {
  const { manager, height, txHash, timestamp, contractEvent } = args

  const actionType = contractEvent.action?.actionType
  if (!actionType) {
    return
  }

  if (actionType === 'distribute') {
    const { amount } = contractEvent.action
    const datetime = new Date(timestamp)
    const govEntity = govService().get()

    if (num(amount).isGreaterThan(0)) {
      const entity = new RewardEntity({
        height, txHash, datetime, token: govEntity.mirrorToken, amount, isGovReward: true
      })
      await manager.save(entity)
    }
  }
}
