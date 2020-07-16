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
  @Column({ type: 'jsonb' })
  codeIds: CodeIds

  @Field()
  @Column()
  mint: string

  @Field()
  @Column()
  market: string

  @Field({ description: 'owner address' })
  @Column()
  owner: string
}
