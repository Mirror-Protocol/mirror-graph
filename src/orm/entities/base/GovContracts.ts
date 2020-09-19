import { Column } from 'typeorm'

// contract addresses
export class GovContracts {
  @Column()
  address: string // gov contract

  @Column()
  mirrorToken: string

  @Column()
  factory: string

  @Column()
  oracle: string

  @Column()
  mint: string

  @Column()
  staking: string

  @Column()
  tokenFactory: string

  @Column()
  collector: string
}
