import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { ObjectType, Field, ID } from 'type-graphql'
import graphqlTypeJson from 'graphql-type-json'
import { ProgramKeys, Program } from 'orm'

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
  boardKey: string

  @Field((type) => graphqlTypeJson)
  @Column({ type: 'jsonb', default: {} })
  assetToken: ProgramKeys

  @Field((type) => graphqlTypeJson)
  @Column({ type: 'jsonb', default: {} })
  oracle: ProgramKeys

  @ManyToOne(() => Program)
  @JoinColumn()
  program: Program
}
