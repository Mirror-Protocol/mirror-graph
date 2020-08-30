import { AccAddress, Coins } from '@terra-money/terra.js'

export interface MsgExecute {
  sender: AccAddress
  contract: AccAddress
  coins: Coins.Data
  execute_msg?: object
}

export interface OracleFeedPriceMsg extends MsgExecute {
  execute_msg: {
    feed_price: {
      price: string
    }
  }
}
