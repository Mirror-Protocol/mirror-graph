import { EntityManager, Not } from 'typeorm'
import { findContractAction } from 'lib/terra'
import { num } from 'lib/num'
import { contractService, accountService, assetService, priceService, txService, govService } from 'services'
import { BalanceEntity, AssetEntity, PriceEntity, ContractEntity, AssetPositionsEntity } from 'orm'
import { ContractType, TxType, AssetStatus } from 'types'
import { ParseArgs } from './parseArgs'

async function getReceivePrice(
  token: string, from: string, to: string, amount: string, args: ParseArgs
): Promise<string> {
  const { manager, contractEvents, timestamp } = args
  const contractRepo = manager.getRepository(ContractEntity)

  const event = findContractAction(contractEvents, from, {
    actionType: 'swap', offerAsset: 'uusd', askAsset: token, returnAmount: amount
  })

  if (event && (await contractService().get({ address: from }, undefined, contractRepo))?.type === ContractType.PAIR) {
    const { offerAmount, returnAmount } = event.action

    return (offerAmount && returnAmount && offerAmount !== '0' && returnAmount !== '0')
      ? num(offerAmount).dividedBy(returnAmount).toString()
      : '0'
  }

  const priceEntity = manager.getRepository(PriceEntity)
  const datetime = new Date(timestamp)

  return (await priceService().getPriceAt(token, datetime.getTime(), priceEntity)) || '0'
}

async function contractTransfer(
  contract: ContractEntity, token: string, value: string, manager: EntityManager, datetime: Date
): Promise<void> {
  if (contract.type !== ContractType.PAIR || contract.token !== token)
    return

  const positionsRepo = manager.getRepository(AssetPositionsEntity)
  const positions = await assetService().getPositions({ token }, undefined, positionsRepo)
  if (!positions)
    return

  // pair contract token balance changed
  positions.pool = num(positions.pool).plus(value).toString()

  // set pool price ohlc
  const priceRepo = manager.getRepository(PriceEntity)
  const poolPrice = (positions.uusdPool !== '0' && positions.pool !== '0')
    ? num(positions.uusdPool).dividedBy(positions.pool).toString()
    : '0'

  await priceService().setOHLC(token, datetime.getTime(), poolPrice, priceRepo, true)

  await positionsRepo.save(positions)
}

export async function parse(args: ParseArgs): Promise<void> {
  const { manager, height, txHash, timestamp, contractEvent, fee } = args

  const actionType = contractEvent.action?.actionType
  if (!actionType)
    return

  if (['send', 'transfer', 'transfer_from', 'send_from'].includes(actionType)) {
    const contractRepo = manager.getRepository(ContractEntity)
    const balanceRepo = manager.getRepository(BalanceEntity)
    const assetRepo = manager.getRepository(AssetEntity)
    const datetime = new Date(timestamp)
    const { from, to, amount } = contractEvent.action
    const { address: token } = contractEvent

    if (!amount || amount === '' || amount === '0' || !from || !to)
      return

    const asset = await assetService().get({ token, status: Not(AssetStatus.COLLATERAL) }, undefined, assetRepo)
    if (!asset)
      return

    const receiverContract = await contractService().get({ address: to }, undefined, contractRepo)
    const senderContract = await contractService().get({ address: from }, undefined, contractRepo)

    if (receiverContract) { // receiver is contract
      await contractTransfer(receiverContract, token, amount, manager, datetime)
    } else { // receiver is user
      const price = await getReceivePrice(token, from, to, amount, args)
      await accountService().addBalance(to, token, price, amount, datetime, balanceRepo)
    }

    if (senderContract) { // sender is contract
      await contractTransfer(senderContract, token, `-${amount}`, manager, datetime)
    } else { // sender is user
      await accountService().removeBalance(from, token, amount, datetime, balanceRepo)
    }

    if (!receiverContract && !senderContract) {
      const tx = { height, txHash, datetime, token, tags: [token], govId: govService().get().id }
      const data = { from, to, amount }

      await txService().newTx({ ...tx, address: to, type: TxType.RECEIVE, data }, manager)
      await txService().newTx({ ...tx, address: from, type: TxType.SEND, data, fee }, manager)
    }
  }
}
