import * as bluebird from 'bluebird'
import { TxInfo, TxLog } from '@terra-money/terra.js'
import { EntityManager, Not, IsNull } from 'typeorm'
import { parseTransfer } from 'lib/terra'
import { num, BigNumber } from 'lib/num'
import { accountService, contractService, assetService, priceService } from 'services'
import {
  BalanceEntity, ContractEntity, AssetPositionsEntity, PriceEntity
} from 'orm'
import { ContractType } from 'types'

async function contractTransfer(
  contract: ContractEntity, value: string, datetime: Date, manager: EntityManager
): Promise<void> {
  if (contract.type !== ContractType.PAIR)
    return

  const positionsRepo = manager.getRepository(AssetPositionsEntity)
  const positions = await assetService().getPositions({ token: contract.token }, undefined, positionsRepo)
  if (!positions)
    return

  // pair contract uusd balance changed
  positions.uusdPool = BigNumber.max(num(positions.uusdPool).plus(value), 0).toString()

  // set pool price ohlc
  const priceRepo = manager.getRepository(PriceEntity)
  const poolPrice = (positions.uusdPool !== '0' && positions.pool !== '0')
    ? num(positions.uusdPool).dividedBy(positions.pool).toString()
    : '0'

  await priceService().setOHLC(contract.token, datetime.getTime(), poolPrice, priceRepo, true)

  await positionsRepo.save(positions)
}

async function accountTransfer(address: string, value: string, datetime: Date, manager: EntityManager): Promise<void> {
  const balanceRepo = manager.getRepository(BalanceEntity)

  const account = await accountService().get({ address, isAppUser: true })

  if (!account)
    return

  await accountService().addBalance(address, 'uusd', '1', value, datetime, balanceRepo)
}

export async function parse(manager: EntityManager, txInfo: TxInfo, log: TxLog): Promise<void> {
  const transfers = parseTransfer(log.events)
  if (!transfers || transfers.length < 1)
    return

  const datetime = new Date(txInfo.timestamp)
  const contractRepo = manager.getRepository(ContractEntity)

  await bluebird.mapSeries(transfers, async (transfer) => {
    const { from, to, denom, amount } = transfer
    if (denom !== 'uusd' || amount === '0')
      return

    const receiverContract = await contractService().get(
      { address: to }, { where: { token: Not(IsNull()) }}, contractRepo
    )
    const senderContract = await contractService().get(
      { address: from }, { where: { token: Not(IsNull()) }}, contractRepo
    )

    if (receiverContract) {
      await contractTransfer(receiverContract, amount, datetime, manager)
    } else {
      await accountTransfer(to, amount, datetime, manager)
    }

    if (senderContract) {
      await contractTransfer(senderContract, `-${amount}`, datetime, manager)
    } else {
      await accountTransfer(from, `-${amount}`, datetime, manager)
    }
  })
}
