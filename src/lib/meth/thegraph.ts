import { GraphQLClient, gql } from 'graphql-request'

export let client: GraphQLClient

interface PairDayData {
  id: string
  date: number
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

export async function getPairDayDatas(pair: string): Promise<void> {
  const result = await getClient().request(
    gql`query($pair: String!) {
      pairDayDatas(
        first: 1,
        orderBy: date,
        orderDirection: desc,
        where: { pairAddress: $pair }
      ) {
        id
        date
        pairAddress
        dailyVolumeUSD
        dailyTxns
      }
    }`,
    {
      pair
    }
  )

  console.log(result)
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
      pairs,
      from,
      to,
    }
  )

  return result?.pairDayDatas.map((data) => ({
    id: data.id,
    date: data.date,
    pairAddress: data.pairAddress,
    reserve0: data.token1.symbol === 'UST' ? data.reserve0 : data.reserve1,
    reserve1: data.token1.symbol === 'UST' ? data.reserve1 : data.reserve0,
    dailyVolumeToken0: data.token1.symbol === 'UST' ? data.dailyVolumeToken0 : data.dailyVolumeToken1,
    dailyVolumeToken1: data.token1.symbol === 'UST' ? data.dailyVolumeToken1 : data.dailyVolumeToken0,
    dailyTxns: data.dailyTxns,
  }))
}
