import { findAttributes, findAttribute } from 'lib/terra'
import { contractService } from 'services'
import { ContractEntity, TxEntity } from 'orm'
import { ContractType, TxType } from 'types'
import { ParseArgs } from './parseArgs'
import * as mint from './mint'
import * as pair from './pair'
import * as staking from './staking'
import * as gov from './gov'

export async function parseHook(args: ParseArgs): Promise<void> {
  const { contract } = args

  switch (contract.type) {
    case ContractType.PAIR:
      return pair.parse(args)

    case ContractType.MINT:
      return mint.parse(args)

    case ContractType.STAKING:
      return staking.parse(args)

    case ContractType.GOV:
      return gov.parse(args)
  }
}

export async function parseTransfer(
  { manager, height, txHash, timestamp, sender, msg, log, contract }: ParseArgs
): Promise<void> {
  const { token, govId } = contract
  const datetime = new Date(timestamp)

  const attributes = findAttributes(log.events, 'from_contract')
  const from = findAttribute(attributes, 'from')
  const to = findAttribute(attributes, 'to')
  const amount = findAttribute(attributes, 'amount')

  const tx = { height, txHash, address: sender, datetime, govId, token, contract }

  const sendTx = new TxEntity({ ...tx, type: TxType.SEND, data: { from, to, amount } })
  const recvTx = new TxEntity({
    ...tx, type: TxType.RECEIVE, data: { from, to, amount }, address: to
  })

  await manager.save([sendTx, recvTx])
}

export async function parse(args: ParseArgs): Promise<void> {
  const { manager, msg } = args

  if(msg['transfer']) {
    return parseTransfer(args)
  } else if (msg['send']?.contract) {
    const address = msg['send'].contract
    const contractRepo = manager.getRepository(ContractEntity)
    const contract = await contractService().get({ address }, undefined, contractRepo)

    if (!contract || !msg['send'].msg)
      return

    const hookMsg = JSON.parse(Buffer.from(msg['send'].msg, 'base64').toString())

    return parseHook(Object.assign(args, { msg: hookMsg, contract }))
  }
}
