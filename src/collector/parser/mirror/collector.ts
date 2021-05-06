import { findAttributes, findAttribute } from 'lib/terra'
import { num } from 'lib/num'
import { govService, assetService, contractService } from 'services'
import { RewardEntity } from 'orm'
import { ParseArgs } from './parseArgs'
import * as pair from './pair'

export async function parse(args: ParseArgs): Promise<void> {
  const { manager, height, txHash, timestamp, msg, log, contract } = args

  if (msg['send'] || msg['distribute']) {
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
  } else if (msg['convert']) {
    const { pair: pairContract } = await assetService().get({ token: msg['convert']['asset_token'] })

    return pair.parse({
      ...args,
      sender: contract.address,
      msg: { 'swap': {} },
      contract: await contractService().get({ address: pairContract }),
    })
  }
}
