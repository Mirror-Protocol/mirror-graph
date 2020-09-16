import 'reflect-metadata'
import * as TypeGraphQL from 'type-graphql'
import { Container } from 'typedi'
import { ApolloServer } from 'apollo-server-koa'
import { errorHandler } from 'lib/error'

let server: ApolloServer

// eslint-disable-next-line
export const ErrorInterceptor: TypeGraphQL.MiddlewareFn<any> = async ({ context, info }, next) => {
  try {
    return await next()
  } catch (error) {
    errorHandler(error)
    throw error
  }
}

export async function initGraphQL(app): Promise<void> {
  const schema = await TypeGraphQL.buildSchema({
    resolvers: [require('path').dirname(require.main.filename) + '/graphql/resolvers/*.ts'],
    container: Container,
    globalMiddlewares: [ErrorInterceptor],
    validate: false,
  })

  server = new ApolloServer({
    schema,
    context: ({ req }): object => req,
    debug: process.env.NODE_ENV !== 'production',
  })

  server.applyMiddleware({ app, path: '/graphql' })
}

export async function finalizeGraphQL(): Promise<void> {
  return server.stop()
}
