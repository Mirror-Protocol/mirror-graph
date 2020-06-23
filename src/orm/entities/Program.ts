import { Entity, PrimaryGeneratedColumn, CreateDateColumn, Column } from 'typeorm'
import { ObjectType, Field, ID } from 'type-graphql'
import graphqlTypeJson from 'graphql-type-json'
import { ProgramIds, ProgramKeys } from '../types'

@ObjectType()
@Entity('program')
export class Program {
  @Field((type) => Date)
  @CreateDateColumn()
  createdAt: Date

  @Field((type) => ID)
  @PrimaryGeneratedColumn()
  id: number

  @Field((type) => graphqlTypeJson)
  @Column({ type: 'jsonb', default: {} })
  programIds: ProgramIds

  @Field((type) => graphqlTypeJson)
  @Column({ type: 'jsonb', default: {} })
  minter: ProgramKeys

  @Field((type) => graphqlTypeJson)
  @Column({ type: 'jsonb', default: {} })
  depositToken: ProgramKeys

  @Field((type) => graphqlTypeJson)
  @Column({ type: 'jsonb', default: {} })
  collateralToken: ProgramKeys
}
