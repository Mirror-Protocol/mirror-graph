import { registerEnumType } from 'type-graphql'

export enum HistoryRanges {
  ONE_HOUR = '1h',
  ONE_DAY = '1d',
  ONE_WEEK = '1w',
  ONE_MONTH = '1month',
  ALL = 'all',
}

registerEnumType(HistoryRanges, { name: 'HistoryRanges' })
