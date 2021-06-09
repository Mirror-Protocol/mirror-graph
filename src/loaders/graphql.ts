import 'reflect-metadata'
import * as TypeGraphQL from 'type-graphql'
import * as path from 'path'
import { Container } from 'typedi'
import { ApolloServer } from 'apollo-server-koa'
import * as Koa from 'koa'
import * as depthLimit from 'graphql-depth-limit'
import { errorHandler } from 'lib/error'
import { GraphQLLogger } from 'lib/graphqlLogger'

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

export async function initGraphQL(app: Koa): Promise<void> {
  const schema = await TypeGraphQL.buildSchema({
    resolvers: [path.dirname(require.main.filename) + '/graphql/resolvers/**/*.ts'],
    container: Container,
    globalMiddlewares: [ErrorInterceptor],
    validate: false,
  })

  server = new ApolloServer({
    schema,
    context: ({ req }) => req,
    debug: process.env.NODE_ENV !== 'production',
    playground: true,
    introspection: true,
    plugins: [GraphQLLogger],
    validationRules: [depthLimit(10)],
  })

  server.applyMiddleware({ app, path: '/graphql' })
}

export async function finalizeGraphQL(): Promise<void> {
  return server.stop()
}
