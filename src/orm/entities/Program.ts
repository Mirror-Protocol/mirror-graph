import { Entity, PrimaryGeneratedColumn, CreateDateColumn, Column } from 'typeorm'
import { ObjectType, Field, ID } from 'type-graphql'

@ObjectType()
@Entity('program')
export class Program {
  @Field((type) => Date)
  @CreateDateColumn()
  createdAt: Date

  @Field((type) => ID)
  @PrimaryGeneratedColumn()
  id: number

  @Field()
  @Column()
  mintProgramId: string

  @Field()
  @Column()
  oracleProgramId: string

  @Field()
  @Column()
  tokenProgramId: string

  @Field()
  @Column()
  marketProgramId: string

  @Field()
  @Column({ nullable: true })
  minterKey?: string

  @Field()
  @Column({ nullable: true })
  depositTokenKey?: string

  @Field()
  @Column({ nullable: true })
  collateralTokenKey?: string

  @Field()
  @Column({ nullable: true })
  minterOwnerSecretKey?: string
}
