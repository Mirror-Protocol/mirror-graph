export enum TxType {
  BUY = 'buy',
  SELL = 'sell',
  SEND = 'send',
  RECEIVE = 'receive',
  SWAP = 'swap',
}

export interface BuyTx {
  offer: string
  receive: string
  spread: string
  fee: string
}
