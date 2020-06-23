import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { ObjectType, Field, ID } from 'type-graphql'
import { Program } from './Program'
// import { ProgramKey } from 'orm'

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

  @Field()
  @Column()
  assetKey: string

  @Field()
  @Column()
  oracleKey: string

  @Field()
  @Column()
  oracleOwnerSecretKey: string

  @ManyToOne(() => Program)
  @JoinColumn()
  program: Program
}
