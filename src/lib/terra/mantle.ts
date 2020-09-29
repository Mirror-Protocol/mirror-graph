import { TxInfo, Msg } from '@terra-money/terra.js'
import { GraphQLClient, gql } from 'graphql-request'
import { pick } from 'lodash'
import { toSnakeCase } from 'lib/caseStyles'

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

function toMsg(type: string, value: string): { type: string; value: unknown } {
  const obj = JSON.parse(value)
  switch (type) {
    case 'wasm/MsgExecuteContract':
      obj['execute_msg'] = Buffer.from(obj.execute_msg).toString('base64')
      break
    case 'wasm/MsgInstantiateContract':
      obj['init_msg'] = Buffer.from(obj.init_msg).toString('base64')
      break
  }
  const msg = Msg.fromData({ type, value: obj } as Msg.Data)
  return msg.toData()
}

export async function getTxs(start: number, end: number, limit = 100): Promise<TxInfo[]> {
  const response = await mantle.request(
    gql`query($range: [Int!]!, $limit: Int) {
      TxInfos(Height_range: $range, Limit: $limit, Order: ASC) {
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
    }`,
    {
      range: [start, end],
      limit
    }
  )

  return response
    ?.TxInfos
    ?.filter((rawTx) => rawTx.Success && !rawTx.Code)
    .map((rawTx) => {
      const infos = ['Height', 'TxHash', 'GasWanted', 'GasUsed', 'RawLog', 'Logs', 'Events', 'Timestamp']
      const { Fee, Msg: Msgs, Signatures, Memo } = rawTx.Tx
      try {
        const tx = {
          type: 'core/StdTx',
          value: {
            msg: Msgs.map((msg) => toMsg(msg.Type, msg.Value)),
            fee: toSnakeCase(Fee),
            signatures: toSnakeCase(Signatures),
            memo: Memo
          }
        }

        return TxInfo.fromData(Object.assign(toSnakeCase(pick(rawTx, infos)), { tx }))
      } catch(error) {
        console.log(rawTx.Tx)
        throw new Error(error)
      }
  })
}
