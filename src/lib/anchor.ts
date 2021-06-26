import { getContractStore } from 'lib/terra'

const anchorMarket = process.env.TERRA_CHAIN_ID.includes('columbus')
  ? 'terra1sepfj7s0aeg5967uxnfk4thzlerrsktkpelm5s'
  : 'terra15dwd5mj8v59wpj0wvt233mf5efdff808c5tkal'

export async function getaUSTPrice(blockHeight: number): Promise<string> {
  const { exchangeRate } = await getContractStore(
    anchorMarket,
    { epochState: { blockHeight } }
  )

  return exchangeRate
}
