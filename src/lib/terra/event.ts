import { Event, EventKV } from '@terra-money/terra.js'

export function findAttributes(events: Event[], type: string): EventKV[] {
  return events.find((event) => event.type === type)?.attributes
}

export function findAttribute(attributes: EventKV[], key: string): string {
  return attributes.find((attr) => attr.key === key)?.value
}
