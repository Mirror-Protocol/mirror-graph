import { Entity, PrimaryGeneratedColumn, CreateDateColumn, Column } from 'typeorm'
import { ObjectType, Field, ID } from 'type-graphql'
import graphqlTypeJson from 'graphql-type-json'
import { CodeIds } from '../types'

@ObjectType()
@Entity('contract')
export class Contract {
  @Field((type) => Date)
  @CreateDateColumn()
  createdAt: Date

  @Field((type) => ID)
  @PrimaryGeneratedColumn()
  id: number

  @Field((type) => graphqlTypeJson)
  @Column({ type: 'jsonb', default: {} })
  codeIds: CodeIds

  @Field()
  @Column({ default: '' })
  mint: string

  @Field()
  @Column({ default: '' })
  oracle: string

  @Field()
  @Column({ default: '' })
  deposit: string

  @Field()
  @Column({ default: '' })
  collateral: string
}
