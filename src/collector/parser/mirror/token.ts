import { contractService } from 'services'
import { ContractEntity } from 'orm'
import { ContractType } from 'types'
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

export async function parse(args: ParseArgs): Promise<void> {
  const { manager, msg } = args

  if (msg['send']?.contract) {
    const address = msg['send'].contract
    const contractRepo = manager.getRepository(ContractEntity)
    const contract = await contractService().get({ address }, undefined, contractRepo)

    if (!contract || !msg['send'].msg)
      return

    const hookMsg = JSON.parse(Buffer.from(msg['send'].msg, 'base64').toString())

    return parseHook(Object.assign(args, { msg: hookMsg, contract }))
  }
}
