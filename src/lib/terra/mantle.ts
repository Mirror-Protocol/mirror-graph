import { TxInfo, Msg } from '@terra-money/terra.js'
import { GraphQLClient, gql } from 'graphql-request'
import { pick } from 'lodash'
import { toSnakeCase, toCamelCase } from 'lib/caseStyles'

export let mantle: GraphQLClient

export function initMantle(URL: string): GraphQLClient {
  mantle = new GraphQLClient(URL)

  return mantle
}

export async function getLatestBlockHeight(): Promise<number> {
  const result = await mantle.request(
    gql`query {
      BaseState {
        Height
      }      
    }`
  )

  return result?.BaseState?.Height
}

export async function getContractStore<T>(address: string, query: unknown): Promise<T> {
  const response = await mantle.request(
    gql`query($address: String!, $query: String!) {
      WasmContractsContractAddressStore(ContractAddress: $address, QueryMsg: $query) {
        Height
        Result
      }
    }`,
    {
      address,
      query: JSON.stringify(query)
    }
  )

  if (!response?.WasmContractsContractAddressStore?.Result) {
    return undefined
  }

  return toCamelCase(JSON.parse(response.WasmContractsContractAddressStore.Result))
}

export async function getTxs(start: number, end: number, limit = 100): Promise<TxInfo[]> {
  const response = await mantle.request(
    gql`query($range: [Int!]!, $limit: Int) {
      Blocks(Height_range: $range, Limit: $limit, Order: ASC, Success: true) {
        Txs {
          Height
          TxHash
          Success
          Code
          GasWanted
          GasUsed
          Timestamp

          RawLog
          Logs {
            MsgIndex
            Log
            Events {
              Type
              Attributes {
                Key
                Value
              }
            }
          }
          Events {
            Type
            Attributes {
              Key
              Value
            }
          }
          Tx {
            Fee {
              Gas
              Amount {
                Denom
                Amount
              }
            }
            Msg {
              Type
              Value
            }
            Memo
            Signatures {
              PubKey {
                Type
                Value
              }
              Signature
            }
          }
        }
      }
    }`,
    {
      range: [start, end],
      limit
    }
  )

  const txs: TxInfo[] = []

  response?.Blocks?.map((Block) => {
    Block.Txs?.map((rawTx) => {
      const infos = toSnakeCase(pick(
        rawTx,
        ['Height', 'GasWanted', 'GasUsed', 'RawLog', 'Logs', 'Events', 'Timestamp']
      ))

      const txValue = toSnakeCase(pick(rawTx.Tx, ['Fee', 'Signatures', 'Memo']))
      const tx = {
        type: 'core/StdTx',
        value: {
          ...txValue,
          msg: rawTx.Tx.Msg.map((msg) =>
            Msg.fromData({ type: msg.Type, value: JSON.parse(msg.Value) }).toData()
          )
        }
      }

      txs.push(TxInfo.fromData({ ...infos, txhash: rawTx.TxHash, tx }))
    })
  })

  return txs
}
