import { ApolloServerPlugin } from 'apollo-server-plugin-base'
import { GraphQLRequestContext } from 'apollo-server-types'
import { GraphQLRequestListener } from 'apollo-server-plugin-base/src/index'
import * as logger from 'lib/logger'

// https://stackoverflow.com/questions/59988906/how-do-i-write-a-apollo-server-plugin-to-log-the-request-and-its-duration
export const GraphQLLogger: ApolloServerPlugin  = {
  requestDidStart<TContext>(_: GraphQLRequestContext<TContext>): GraphQLRequestListener<TContext> {
    const start = Date.now()

    return {
      didResolveOperation(context) {
        if (context.operationName === 'IntrospectionQuery') {
          return
        }

        const { operation, operationName, queryHash } = context

        logger.info(`${queryHash.substr(-6)} ${operation?.operation} ${operationName}: ${JSON.stringify(context.request.variables)}`)
      },

      didEncounterErrors(context) {
        const {
          operation,
          operationName,
          queryHash,
          errors,
        } = context

        logger.info(`${queryHash.substr(-6)} ${operation?.operation} ${operationName} error: ${JSON.stringify(errors)}`)
      },

      willSendResponse(context) {
        if (context.operationName === 'IntrospectionQuery') {
          return
        }

        const {
          operation,
          operationName,
          queryHash,
        } = context

        const elapsed = Date.now() - start
        const size = JSON.stringify(context.response).length * 2

        logger.info(`${queryHash.substr(-6)} ${operation?.operation} ${operationName} response duration=${elapsed}ms bytes=${size}`)
      }
    }
  },
}
