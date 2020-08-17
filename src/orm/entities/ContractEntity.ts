import { Entity, PrimaryGeneratedColumn, CreateDateColumn, Column } from 'typeorm'
import { ObjectType, Field, ID } from 'type-graphql'
import graphqlTypeJson from 'graphql-type-json'
import { CodeIds } from '../types'

@ObjectType()
@Entity('contract')
export class ContractEntity {
  @Field((type) => Date)
  @CreateDateColumn()
  createdAt: Date

  @Field((type) => ID)
  @PrimaryGeneratedColumn()
  id: number

  @Field((type) => graphqlTypeJson)
  @Column({ type: 'jsonb' })
  codeIds: CodeIds

  @Field({ description: 'mint contract address' })
  @Column()
  mint: string

  @Field({ description: 'market contract address' })
  @Column()
  market: string

  @Field({ description: 'owner account address' })
  @Column()
  owner: string
}
