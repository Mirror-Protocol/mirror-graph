import { GraphQLClient, gql } from 'graphql-request'

export let client: GraphQLClient

interface PairDayData {
  id: string
  timestamp: number
  pairAddress: string
  reserve0: string
  reserve1: string
  dailyVolumeToken0: string
  dailyVolumeToken1: string
  dailyTxns: string
}

export function getClient(): GraphQLClient {
  if (!client) {
    client = new GraphQLClient(
      'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
      { timeout: 60000, keepalive: true }
    )
  }

  return client
}

export async function getPairDayDatas(
  pair: string, from: number, to: number, limit: number, orderDirection: string
): Promise<PairDayData[]> {
  const result = await getClient().request(
    gql`query($pair: String!, $from: Int!, $to: Int!, $orderDirection: String!, $limit: Int!) {
      pairDayDatas(
        where: {
          pairAddress: $pair,
          date_gte: $from,
          date_lte: $to,
        },
        orderBy: date,
        orderDirection: $orderDirection,
        first: $limit
      ) {
        id
        date
        pairAddress
        token0 {
          symbol
        }
        token1 {
          symbol
        }
        reserve0
        reserve1
        dailyVolumeToken0
        dailyVolumeToken1
        dailyTxns
      }
    }`,
    {
      pair: pair.toLowerCase(),
      from: Math.floor(from / 1000),
      to: Math.floor(to / 1000),
      limit,
      orderDirection,
    }
  )

  return result?.pairDayDatas.map((data) => ({
    id: data.id,
    timestamp: data.date * 1000,
    pairAddress: data.pairAddress,
    reserve0: data.token1.symbol === 'UST' ? data.reserve0 : data.reserve1,
    reserve1: data.token1.symbol === 'UST' ? data.reserve1 : data.reserve0,
    dailyVolumeToken0: data.token1.symbol === 'UST' ? data.dailyVolumeToken0 : data.dailyVolumeToken1,
    dailyVolumeToken1: data.token1.symbol === 'UST' ? data.dailyVolumeToken1 : data.dailyVolumeToken0,
    dailyTxns: data.dailyTxns,
  }))
}

export async function getPairsDayDatas(pairs: string[], from: number, to: number): Promise<PairDayData[]> {
  const result = await getClient().request(
    gql`query($pairs: [String!]!, $from: Int!, $to: Int!) {
      pairDayDatas(
        where: {
          pairAddress_in: $pairs,
          date_gte: $from,
          date_lte: $to,
        },
        orderBy: date,
        orderDirection: asc,
      ) {
        id
        date
        pairAddress
        token0 {
          symbol
        }
        token1 {
          symbol
        }
        reserve0
        reserve1
        dailyVolumeToken0
        dailyVolumeToken1
        dailyTxns
      }
    }`,
    {
      pairs: pairs.map((pair) => pair.toLowerCase()),
      from: Math.floor(from / 1000),
      to: Math.floor(to / 1000),
    }
  )

  return result?.pairDayDatas.map((data) => ({
    id: data.id,
    timestamp: data.date * 1000,
    pairAddress: data.pairAddress,
    reserve0: data.token1.symbol === 'UST' ? data.reserve0 : data.reserve1,
    reserve1: data.token1.symbol === 'UST' ? data.reserve1 : data.reserve0,
    dailyVolumeToken0: data.token1.symbol === 'UST' ? data.dailyVolumeToken0 : data.dailyVolumeToken1,
    dailyVolumeToken1: data.token1.symbol === 'UST' ? data.dailyVolumeToken1 : data.dailyVolumeToken0,
    dailyTxns: data.dailyTxns,
  }))
}
