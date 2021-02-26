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

        const {
          operation: { operation, name: { value } },
          queryHash,
        } = context

        logger.info(`${queryHash.substr(-6)} ${operation} ${value}: ${JSON.stringify(context.request.variables)}`)
      },

      didEncounterErrors(context) {
        const {
          operation: { operation, name: { value } },
          queryHash,
          errors,
        } = context

        logger.info(`${queryHash.substr(-6)} ${operation} ${value} error: ${JSON.stringify(errors)}`)
      },

      willSendResponse(context) {
        if (context.operationName === 'IntrospectionQuery') {
          return
        }

        const {
          operation: { operation, name: { value } },
          queryHash,
        } = context

        const elapsed = Date.now() - start
        const size = JSON.stringify(context.response).length * 2

        logger.info(`${queryHash.substr(-6)} ${operation} ${value} response duration=${elapsed}ms bytes=${size}`)
      }
    }
  },
}
