export enum MirrorTxType {
  BUY = 'buy',
  SELL = 'sell',
}

export interface MirrorTxBuy {
  offer: string
  receive: string
  spread: string
  fee: string
}
