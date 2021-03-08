import * as bluebird from 'bluebird'
import { EntityManager } from 'typeorm'
import { ContractActions, findAttributes, parseContractActions } from 'lib/terra'
import { num, BigNumber } from 'lib/num'
import { contractService, accountService, assetService, priceService, txService, govService } from 'services'
import { BalanceEntity, AssetEntity, PriceEntity, ContractEntity, AssetPositionsEntity } from 'orm'
import { ContractType, TxType } from 'types'
import { ParseArgs } from './parseArgs'

async function getBuyPrice(
  token: string, contractActions: ContractActions, args: ParseArgs
): Promise<string> {
  const { manager, contract, timestamp, msg } = args

  // calculate buy price when buying
  if (contract?.type === ContractType.PAIR &&
    msg['swap'] &&
    contractActions?.swap[0]?.offerAsset === 'uusd'
  ) {
    const { offerAmount, returnAmount } = contractActions.swap[0]

    return (offerAmount !== '0' && returnAmount !== '0')
      ? num(offerAmount).dividedBy(returnAmount).toString()
      : '0'
  }

  const priceEntity = manager.getRepository(PriceEntity)
  const datetime = new Date(timestamp)

  return (await priceService().getPrice(token, datetime.getTime(), priceEntity)) || '0'
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
  positions.pool = BigNumber.max(num(positions.pool).plus(value), 0).toString()

  // set pool price ohlc
  const priceRepo = manager.getRepository(PriceEntity)
  const poolPrice = (positions.uusdPool !== '0' && positions.pool !== '0')
    ? num(positions.uusdPool).dividedBy(positions.pool).toString()
    : '0'

  await priceService().setOHLC(token, datetime.getTime(), poolPrice, priceRepo, true)

  await positionsRepo.save(positions)
}

export async function parse(args: ParseArgs): Promise<void> {
  const { manager, contract, height, txHash, timestamp, log, fee } = args
  const attributes = findAttributes(log.events, 'from_contract')
  if (!attributes) {
    return
  }

  const contractActions = parseContractActions(log.events)
  const contractRepo = manager.getRepository(ContractEntity)
  const balanceRepo = manager.getRepository(BalanceEntity)
  const assetRepo = manager.getRepository(AssetEntity)
  const datetime = new Date(timestamp)

  const transfers = []
  Array.isArray(contractActions.send) && transfers.push(...contractActions.send)
  Array.isArray(contractActions.transfer) && transfers.push(...contractActions.transfer)
  Array.isArray(contractActions.transferFrom) && transfers.push(...contractActions.transferFrom)
  Array.isArray(contractActions.sendFrom) && transfers.push(...contractActions.sendFrom)

  await bluebird.mapSeries(transfers, async (action) => {
    const { contract: token, from, to, amount } = action
    if (amount === '0' || !from || !to)
      return

    const asset = await assetService().get({ token }, undefined, assetRepo)
    if (!asset)
      return
    const receiverContract = await contractService().get({ address: to }, undefined, contractRepo)
    const senderContract = await contractService().get({ address: from }, undefined, contractRepo)
    const tx = { height, txHash, datetime, token, contract, tags: [token], govId: govService().get().id }
    const data = { from, to, amount }

    if (receiverContract) { // receiver is contract
      await contractTransfer(receiverContract, token, amount, manager, datetime)
    } else if (asset) { // receiver is user, record balance
      const price = await getBuyPrice(token, contractActions, args)
      await accountService().addBalance(to, token, price, amount, datetime, balanceRepo)
    }

    if (senderContract) {
      await contractTransfer(senderContract, token, `-${amount}`, manager, datetime)

      await txService().newTx({ ...tx, address: to, type: TxType.RECEIVE, data }, manager)
    } else if (asset) {
      await accountService().removeBalance(from, token, amount, datetime, balanceRepo)

      await txService().newTx({ ...tx, address: from, type: TxType.SEND, data, fee }, manager)
    }
  })
}
