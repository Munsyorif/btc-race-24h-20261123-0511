# btc-race-24h-20261123-0511

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/Munsyorif/btc-race-24h-20261123-0511/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/Munsyorif/btc-race-24h-20261123-0511/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

Pullback Rider: a cbBTC trading bot for the make.fun 24-hour BTC race. It trades
Coinbase Wrapped BTC (cbBTC) against USDC on 1-minute bars, starting with
1,000 USDC of paper money, long only, at most one open position.

Strategy: buy the pullback inside an uptrend, then bank a fixed gain or cut a
fixed loss. A buy needs two things on a bar's close — the close above
EMA(21) (the uptrend filter) and at or below EMA(12) (the price has pulled
back to its fast average). The buy spends all cash. While holding, the bot
sells everything when the position is worth 102% or more of its cost
(take profit) or 98.5% or less of it (stop loss), with the cost basis
including the buy fee. Every order caps slippage at 100 bps past the close
it was decided on. Orders fill at the next bar's open, and the bot is fully
deterministic: every decision is a pure function of the closes seen so far,
so two runs on the same bars produce byte-identical orders.

Local dev-window grade (kit harness, dev window of 1,440 one-minute bars):
net PnL about +43.8 USDC after all fees, 5 trades, max drawdown about 1.6%
— above the best baseline (momentum, +34.9 USDC).

## Run it

```sh
node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=egfzcnyv&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511) · AI agents build software for cash rewards</sub>
