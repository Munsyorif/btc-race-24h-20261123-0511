// Pullback Rider — a cbBTC trend-pullback bot for the make.fun btc-race-24h bounty.
//
// Idea: Bitcoin trends more often than it ranges on a 24h window, but buying the
// top of a 1-minute spike is expensive (a full-size round trip pays ~26 bps in
// fee, slippage and pool impact). So this bot only buys a pullback inside an
// uptrend, then banks a fixed gain or cuts a fixed loss and waits for the next
// pullback. It never shorts, never uses leverage, and holds at most one
// position. Every decision is a pure function of the closes seen so far, so
// two runs on the same bars produce byte-identical orders.
//
// Rules, evaluated on each bar's close (orders fill at the next bar's open):
//   - Trend filter: the close must be above EMA(21). No uptrend, no buy.
//   - Pullback entry: while flat, buy when the close is at or below EMA(12)
//     (the price has pulled back to its fast average inside the uptrend).
//     The buy spends all cash, up to the weight cap.
//   - Take profit: while holding, sell everything when the position is worth
//     102% or more of its cost (fees included in the cost basis).
//   - Stop loss: while holding, sell everything when the position is worth
//     98.5% or less of its cost.
//   - Each order caps slippage at 100 bps past the close it was decided on,
//     so a fill into a liquidity gap is refused rather than taken.
//
// The EMAs are seeded as the mean of their first span of closes, then move
// 2 / (span + 1) of the way to each new close (float64, IEEE 754, so the
// same bars always give the same values). A bar with no volume recorded
// (v null) is still a bar: it updates the EMAs like any other.

import { runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const FAST_SPAN = 12;
const SLOW_SPAN = 21;
/** Take profit: sell when value >= 102% of cost. */
const TAKE_NUM = 1020n;
/** Stop loss: sell when value <= 98.5% of cost. */
const STOP_NUM = 985n;
const RATIO_DEN = 1000n;
/** Max slippage, in bps past the close an order was decided on. */
const MAX_SLIPPAGE_BPS = 100;

/** One EMA: the closes it has seen until it starts, then its value. */
interface Ema {
  span: number;
  warm: number[];
  value: number | null;
}

const fast: Ema = { span: FAST_SPAN, warm: [], value: null };
const slow: Ema = { span: SLOW_SPAN, warm: [], value: null };

function step(e: Ema, close: number): void {
  if (e.value !== null) {
    e.value += (2 / (e.span + 1)) * (close - e.value);
    return;
  }
  e.warm.push(close);
  if (e.warm.length === e.span) {
    e.value = e.warm.reduce((a, x) => a + x, 0) / e.span;
  }
}

await runBars({
  onBatch(state: BarsState, batch) {
    // Feed this batch's bar into both EMAs before deciding. A minute the
    // recorder missed carries no bar for the symbol: decide on nothing then,
    // rather than on a stale close.
    let fresh = false;
    for (const bar of batch.bars) {
      if (bar.symbol !== SYMBOL) continue;
      fresh = true;
      step(fast, Number(bar.c));
      step(slow, Number(bar.c));
    }
    if (state.warmingUp || !fresh) return [];

    const held = state.positions.get(SYMBOL);
    const close = state.close(SYMBOL);
    if (close === null) return [];

    if (held !== undefined) {
      // Holding: take the gain or cut the loss, measured against the cost
      // basis (which already includes the buy fee). Integer ratio, no float:
      // value/cost >= 102/100 is the take, value/cost <= 98.5/100 the stop.
      const value = state.value(SYMBOL, held.qty);
      const takeProfit = value * RATIO_DEN >= held.cost * TAKE_NUM;
      const stopLoss = value * RATIO_DEN <= held.cost * STOP_NUM;
      if (takeProfit || stopLoss) {
        const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [sell];
      }
      return [];
    }

    // Flat: buy the pullback, but only inside an uptrend.
    if (fast.value === null || slow.value === null) return [];
    const closeNum = Number(close);
    if (closeNum > slow.value && closeNum <= fast.value) {
      const { fees } = state.hello;
      const room = state.weightRoom(SYMBOL);
      const slice = state.cash < room ? state.cash : room;
      if (slice === 0n || slice < BigInt(fees.min_notional_quote_units)) return [];
      const buy: BuyInput = { side: 'buy', symbol: SYMBOL, notional_quote_units: slice, max_slippage_bps: MAX_SLIPPAGE_BPS };
      return [buy];
    }
    return [];
  },
});
