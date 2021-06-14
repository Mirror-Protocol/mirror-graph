import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class AccountVoted {
  @Field()
  pollId: string

  @Field()
  amount: string

  @Field()
  voteOption: string
}
