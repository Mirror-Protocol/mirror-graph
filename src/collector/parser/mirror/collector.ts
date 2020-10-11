import { findAttributes, findAttribute } from 'lib/terra'
import { num } from 'lib/num'
import { ParseArgs } from './parseArgs'
import { govService } from 'services'
import { RewardEntity } from 'orm'

export async function parse(
  { manager, height, txHash, timestamp, msg, log, contract }: ParseArgs
): Promise<void> {
  if (msg['send']) {
    const datetime = new Date(timestamp)
    const attributes = findAttributes(log.events, 'from_contract')
    const amount = findAttribute(attributes, 'amount')
    const to = findAttribute(attributes, 'to')
    const govEntity = govService().get()

    if (to === govEntity.gov && num(amount).isGreaterThan(0)) {
      const entity = new RewardEntity({
        height, txHash, datetime, token: govEntity.mirrorToken, amount, isGovReward: true
      })
      await manager.save(entity)
    }
  }
}
