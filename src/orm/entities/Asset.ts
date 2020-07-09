import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { ObjectType, Field, ID } from 'type-graphql'
// import graphqlTypeJson from 'graphql-type-json'
import { Contract } from 'orm'

@ObjectType()
@Entity('asset')
export class Asset {
  @Field((type) => Date)
  @CreateDateColumn()
  createdAt: Date

  @Field((type) => ID)
  @PrimaryGeneratedColumn()
  id: number

  @Field()
  @Column()
  symbol: string

  @Field()
  @Column()
  tokenAddress: string

  @Field()
  @Column()
  oracleAddress: string

  @ManyToOne(() => Contract)
  @JoinColumn()
  contract: Contract
}
