import { BigNumber } from 'bignumber.js'
import config from 'config'

BigNumber.config({
  DECIMAL_PLACES: config.DECIMALS,
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
})

export function num(number: number | string): BigNumber {
  return new BigNumber(number)
}

export * from 'bignumber.js'
