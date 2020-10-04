import { registerEnumType } from 'type-graphql'

export enum HistoryRanges {
  ONE_HOUR = 'ONE_HOUR',
  ONE_DAY = 'ONE_DAY',
  ONE_WEEK = 'ONE_WEEK',
  ONE_MONTH = 'ONE_MONTH',
  ONE_YEAR = 'ONE_YEAR',
  ALL = 'all',
}
registerEnumType(HistoryRanges, { name: 'HistoryRanges' })
