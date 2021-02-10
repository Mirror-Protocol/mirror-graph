import { Event, EventKV, Coins } from '@terra-money/terra.js'
import { toCamelCase } from 'lib/caseStyles'

export interface ContractActions {
  [action: string]: { [key: string]: string }[]
}

export interface Transfer {
  from: string
  to: string
  denom: string
  amount: string
}

export function findAttributes(events: Event[], type: string, attribute?: EventKV): EventKV[] {
  if (attribute) {
    for (const event of events) {
      if (event.type === type) {
        for (const attr of event.attributes) {
          if (attr.key === attribute.key && attr.value === attribute.value) {
            return event.attributes
          }
        }
      }
    }
    return undefined
  }

  return events.find((event) => event.type === type)?.attributes
}

export function findAttribute(attributes: EventKV[], key: string): string {
  return attributes.find((attr) => attr.key === key)?.value
}

export function parseContractActions(events: Event[]): ContractActions {
  const attributes = findAttributes(events, 'from_contract')
  if (!attributes) {
    return
  }

  const contractActions: ContractActions = {}
  let contract

  for (let i = 0; i < attributes.length; i += 1) {
    const attr = attributes[i]
    if (attr.key === 'contract_address') {
      contract = attr.value
      continue
    }

    if (attr.key === 'action') {
      const action = attr.value
      const values = { contract }

      for (i = i + 1; i < attributes.length; i += 1) {
        const attr = attributes[i]

        if (attr.key === 'contract_address' || attr.key === 'action') {
          i = i - 1
          break
        }

        values[attr.key] = attr.value
      }

      contractActions[action] = contractActions[action] || []
      contractActions[action].push(values)
    }
  }

  return toCamelCase(contractActions)
}

export function parseTransfer(events: Event[]): Transfer[] {
  const attributes = findAttributes(events, 'transfer')
  if (!attributes) {
    return
  }

  const transfers = []

  for (let i = 0; i < attributes.length / 3; i += 1) {
    const to = attributes[i * 3].value
    const from = attributes[i * 3 + 1].value
    const coins = Coins.fromString(attributes[i * 3 + 2].value)
    coins.map((coin) => {
      const { denom, amount } = coin.toData()

      transfers.push({ from, to, denom, amount })
    })
  }

  return transfers
}
