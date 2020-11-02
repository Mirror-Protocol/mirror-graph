import { registerEnumType } from 'type-graphql'

export enum AssetStatus {
  NONE = 'NONE',
  LISTING = 'LISTING',
  MIGRATED = 'MIGRATED',
}

registerEnumType(AssetStatus, { name: 'AssetStatus' })
