import { Column, JoinColumn, ManyToOne } from 'typeorm'
import { GovEntity } from '../gov/GovEntity'

export class HaveGov {
  @ManyToOne((type) => GovEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gov_id' })
  gov: GovEntity

  @Column()
  govId: number
}
