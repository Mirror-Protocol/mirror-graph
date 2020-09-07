import { registerEnumType } from 'type-graphql'

export enum HistoryRanges {
  ONE_HOUR = '1hour',
  ONE_DAY = '1day',
  ONE_WEEK = '1week',
  ONE_MONTH = '1month',
  ALL = 'all',
}

registerEnumType(HistoryRanges, { name: 'HistoryRanges' })
