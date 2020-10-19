import { Event, EventKV } from '@terra-money/terra.js'
import { toCamelCase } from 'lib/caseStyles'

export interface ContractActions {
  [action: string]: { [key: string]: string }[]
}

export function findAttributes(events: Event[], type: string): EventKV[] {
  return events.find((event) => event.type === type)?.attributes
}

export function findAttribute(attributes: EventKV[], key: string): string {
  return attributes.find((attr) => attr.key === key)?.value
}

export function parseContractActions(attributes: EventKV[]): ContractActions {
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
