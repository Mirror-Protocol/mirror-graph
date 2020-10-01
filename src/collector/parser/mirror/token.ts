import { Container } from 'typedi'
import { ContractService } from 'services'
import { ContractEntity } from 'orm'
import { ContractType } from 'types'
import { ParseArgs } from './types'
import * as mint from './mint'
import * as pair from './pair'
import * as staking from './staking'

export async function parseHook(args: ParseArgs): Promise<void> {
  const { contract } = args

  switch (contract.type) {
    case ContractType.PAIR:
      return pair.parse(args)
    case ContractType.MINT:
      return mint.parse(args)
    case ContractType.STAKING:
      return staking.parse(args)
  }
}

export async function parseSend(args: ParseArgs): Promise<void> {
  const { manager, msg } = args
  const { contract: hookAddress } = msg['send']

  if (hookAddress) {
    const contractService = Container.get(ContractService)
    const hookContract = await contractService.get(
      { address: hookAddress }, manager.getRepository(ContractEntity)
    )
    if (!hookContract || !msg['send'].msg) {
      return
    }
    const hookMsg = JSON.parse(Buffer.from(msg['send'].msg, 'base64').toString())
    return parseHook(Object.assign(args, { msg: hookMsg, contract: hookContract }))
  }

  // todo: parse normal send
}

export async function parse(args: ParseArgs): Promise<void> {
  const { msg } = args

  if (msg['send']) {
    return parseSend(args)
  }
}
