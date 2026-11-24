import test from "node:test";
import assert from "node:assert/strict";
import {
  chanceOfProfit,
  expirationStats,
  syntheticLiquidity,
  liquidityQuote,
  moneyness,
  orderedRows,
  returnsValue,
  validDisplay,
} from "../dist/chain-model.js";
import { payoffGraph } from "../dist/chain-ui.js";
import { fresh, restore } from "../dist/storage.js";
import { preview, execute, closeLongQuantity } from "../dist/execution.js";
import { price, quote } from "../dist/pricing.js";
import {
  practiceLots,
  checkPracticeOrder,
  submitPracticeOrder,
  processPracticeLimits,
  replayLots,
  closeReplayQuantity,
  checkReplayOrder,
} from "../dist/chain-orders.js";
import {
  newReplay,
  visible,
  enter,
  modelQuote,
} from "../dist/platform-engine.js";
const c = {
  type: "call",
  side: "buy",
  spot: 100,
  strike: 100,
  days: 365,
  iv: 0.2,
  premium: 0,
  rate: 0,
  dividend: 0,
  fees: 0,
};
test("COP uses terminal break-even distribution, not call delta", () => {
  const cop = chanceOfProfit(c);
  assert.ok(Math.abs(cop - 0.460172) < 0.00001);
  assert.ok(Math.abs(cop - quote("call", 100, 100, 365, 0.2).delta) > 0.07);
  assert.ok(chanceOfProfit({ ...c, premium: 5 }) < cop);
});
test("all four COP payoff orientations and transaction costs", () => {
  const long = chanceOfProfit({ ...c, premium: 3 }),
    short = chanceOfProfit({ ...c, premium: 3, side: "sell" });
  assert.ok(Math.abs(long + short - 1) < 1e-10);
  assert.ok(
    chanceOfProfit({ ...c, type: "put", premium: 3 }) <
      chanceOfProfit({ ...c, type: "put", premium: 3, side: "sell" }),
  );
  assert.ok(chanceOfProfit({ ...c, premium: 3, fees: 0.02 }) < long);
  assert.ok(
    chanceOfProfit({ ...c, premium: 3, fees: 0.02, side: "sell" }) < short,
  );
});
test("expiration and deterministic zero-volatility COP are strict profit events", () => {
  assert.equal(chanceOfProfit({ ...c, days: 0, spot: 110, premium: 10 }), 0);
  assert.equal(chanceOfProfit({ ...c, days: 0, spot: 111, premium: 10 }), 1);
  assert.equal(chanceOfProfit({ ...c, iv: 0, premium: 3, rate: 0.05 }), 1);
  assert.equal(chanceOfProfit({ ...c, iv: 0, premium: 6, rate: 0.05 }), 0);
  assert.equal(chanceOfProfit({ ...c, type: "put", premium: 101 }), 0);
  assert.equal(
    chanceOfProfit({ ...c, type: "put", side: "sell", premium: 101 }),
    1,
  );
});
test("invalid COP and returns inputs reject before calculation", () => {
  for (const bad of [
    { iv: NaN },
    { spot: 0 },
    { days: -1 },
    { premium: -1 },
    { side: "short" },
    { fees: Infinity },
  ])
    assert.throws(() => chanceOfProfit({ ...c, ...bad }));
  assert.throws(() => returnsValue(c, 110, -1, 0, 86400000));
  assert.throws(() => returnsValue(c, 110, 86400001, 0, 86400000));
  assert.throws(() => returnsValue(c, 110, 0, 0, 86400000, 0.5));
});
test("break-even, max loss and profit include fees and correct side", () => {
  assert.deepEqual(expirationStats({ ...c, premium: 2, fees: 0.01 }), {
    breakeven: 102.01,
    maxProfit: Infinity,
    maxLoss: 2.01,
  });
  assert.equal(
    expirationStats({ ...c, type: "put", premium: 2, fees: 0.01 }).breakeven,
    97.99,
  );
  assert.equal(
    expirationStats({ ...c, side: "sell", premium: 2, fees: 0.01 }).breakeven,
    101.99,
  );
  assert.equal(
    expirationStats({ ...c, type: "put", side: "sell", premium: 2, fees: 0.01 })
      .maxLoss,
    98.01,
  );
});
const liquidityInput = {
  ticker: "DEMO",
  type: "call",
  strike: 100,
  expiry: Date.parse("2026-03-01T21:00Z"),
  time: Date.parse("2026-02-02T18:00Z"),
};
test("synthetic volume and OI are reproducible, separate and session-aware", () => {
  const a = syntheticLiquidity(liquidityInput),
    b = syntheticLiquidity(liquidityInput);
  assert.deepEqual(a, b);
  assert.notEqual(a.volume, a.openInterest);
  assert.equal(
    syntheticLiquidity({
      ...liquidityInput,
      time: Date.parse("2026-02-03T14:30Z"),
    }).volume,
    0,
  );
  assert.equal(
    syntheticLiquidity({
      ...liquidityInput,
      time: Date.parse("2026-02-03T14:30Z"),
    }).openInterest,
    a.openInterest,
  );
  assert.ok(
    syntheticLiquidity({
      ...liquidityInput,
      time: Date.parse("2026-02-02T20:00Z"),
    }).volume >= a.volume,
  );
});
test("higher synthetic OI narrows the spread without changing model mid or Greeks", () => {
  const rows = Array.from({ length: 30 }, (_, i) =>
    liquidityQuote(
      { mid: 5, delta: 0.6 },
      { ...liquidityInput, strike: 90 + i },
    ),
  );
  rows.sort((a, b) => a.liquidity.openInterest - b.liquidity.openInterest);
  assert.ok(rows.at(-1).ask - rows.at(-1).bid < rows[0].ask - rows[0].bid);
  for (const q of rows) {
    assert.equal(q.mid, 5);
    assert.equal(q.delta, 0.6);
    assert.ok(q.bid <= q.mid && q.ask >= q.mid);
  }
  assert.equal(
    liquidityQuote(
      { mid: 10 },
      { ...liquidityInput, time: liquidityInput.expiry },
    ).ask,
    10,
  );
});
test("strike ordering and divider handle above, below and exact ATM", () => {
  const rows = [98, 103, 100, 102].map((strike) => ({ strike }));
  assert.deepEqual(
    orderedRows(rows, 101).rows.map((r) => r.strike),
    [103, 102, 100, 98],
  );
  assert.equal(orderedRows(rows, 101).divider, 2);
  assert.equal(orderedRows(rows, 100).atm, true);
  assert.equal(orderedRows(rows, 200).divider, 0);
  assert.equal(orderedRows(rows, 1).divider, 4);
  assert.equal(orderedRows(rows, 101, "asc").divider, 2);
  assert.equal(moneyness("put", 101, 100), "OTM");
  assert.equal(moneyness("call", 100, 100), "ATM");
});
test("returns use 100 multiplier, pre-expiry model and separate time value", () => {
  const model = { ...c, premium: 2, days: 30, fees: 0.01 };
  const exp = returnsValue(model, 110, 30 * 86400000, 0, 30 * 86400000, 2);
  assert.equal(exp.value, 10);
  assert.ok(Math.abs(exp.pnl - 1598) < 1e-8);
  assert.equal(exp.remainingTimeValue, 0);
  const before = returnsValue(model, 100, 0, 0, 30 * 86400000);
  assert.equal(before.value, price("call", 100, 100, 30, 0.2));
  assert.ok(before.remainingTimeValue > 0);
});
test("payoff SVG has zero line, price axes, break-even and adjustable future marker", () => {
  const svg = payoffGraph(
    { ...c, premium: 2 },
    0,
    30 * 86400000,
    30 * 86400000,
    1,
    105,
  );
  assert.ok(svg.includes("Expiry B/E 102.00"));
  assert.ok(svg.includes("Future input 105.00"));
  assert.ok(svg.includes("Underlying · USD"));
  assert.ok(svg.includes("P/L · USD"));
  assert.ok(!svg.includes("NaN"));
});
test("partial practice close allocates basis and leaves other quantity intact", () => {
  const s = fresh(),
    a = s.accounts.sim,
    q = () => ({ bid: 1.9, ask: 2 }),
    p = preview(a, "Long call", 2, "DEMO", "2026-12-01", 100, 105, q);
  execute(a, p, "lot");
  assert.equal(
    closeLongQuantity(a, "lot", 1, () => ({ bid: 3, ask: 3.1 })),
    100,
  );
  assert.equal(a.positions[0].qty, 1);
  assert.equal(a.positions[0].debit, 200);
  assert.equal(
    closeLongQuantity(a, "lot", 1, () => ({ bid: 3.5, ask: 3.6 })),
    150,
  );
  assert.equal(a.cash, 10250);
  assert.equal(a.realized, 250);
  assert.throws(() => closeLongQuantity(a, "lot", 1, q));
});
function order(s) {
  return {
    contract: {
      ticker: "DEMO",
      type: "call",
      strike: 100,
      expiry: Date.parse(s.market.base + "T12:00Z") + 30 * 86400000,
    },
    side: "buy",
    kind: "Market",
    qty: 1,
    reason: "Test plan",
  };
}
test("practice chain validates funds, prevents shorts and creates portfolio/journal entries", () => {
  const s = fresh(),
    o = order(s),
    get = () => ({ bid: 1.9, ask: 2 });
  submitPracticeOrder(s, o, get);
  assert.equal(s.accounts.sim.cash, 9800);
  assert.equal(s.journal.length, 1);
  const lots = practiceLots(s, o.contract);
  assert.equal(lots.length, 1);
  assert.throws(() =>
    checkPracticeOrder(s, { ...o, side: "sell", lot: "missing" }, get),
  );
  assert.throws(() => checkPracticeOrder(s, { ...o, qty: 100 }, get));
  submitPracticeOrder(s, { ...o, side: "sell", lot: lots[0].id }, get);
  assert.equal(s.accounts.sim.positions.length, 0);
  assert.equal(s.accounts.sim.realized, -10);
});
test("conditional practice buys use later asks and never overdraw", () => {
  const s = fresh(),
    o = { ...order(s), kind: "Limit", limit: 1 },
    get = () => ({ bid: 0.8, ask: 0.9 });
  submitPracticeOrder(s, o, get);
  assert.equal(s.accounts.sim.positions.length, 0);
  processPracticeLimits(s, get);
  assert.equal(s.accounts.sim.positions.length, 0);
  s.market.day++;
  processPracticeLimits(s, get);
  assert.equal(s.accounts.sim.positions.length, 1);
  assert.equal(s.accounts.sim.positions[0].debit, 90);
  assert.equal(s.chainOrders[0].status, "filled");
  processPracticeLimits(s, get);
  assert.equal(s.accounts.sim.positions.length, 1);
});
test("owned replay partial close preserves basis, costs and distinct journal IDs", () => {
  const r = newReplay(),
    b = visible(r).at(-1),
    p = enter(r, {
      type: "call",
      strike: Math.round(b.close),
      expiry: b.time + 21 * 86400000,
      qty: 2,
      stop: 0.01,
      target: 100,
    });
  const cost = p.cost;
  closeReplayQuantity(r, p.id, 1);
  assert.equal(r.positions[0].qty, 1);
  assert.ok(Math.abs(r.positions[0].cost + r.trades[0].cost - cost) < 0.001);
  closeReplayQuantity(r, p.id, 1);
  assert.equal(r.positions.length, 0);
  assert.equal(new Set(r.trades.map((t) => t.id)).size, 2);
  assert.equal(r.cash, Math.round((10000 + r.realized) * 100) / 100);
});
test("replay pricing, displayed chain quote and ask fill use the same clock/IV", () => {
  const r = newReplay();
  r.settings.iv = 0.6;
  const b = visible(r).at(-1),
    strike = Math.round(b.close),
    expiry = b.time + 21 * 86400000,
    display = modelQuote(
      "call",
      b.close,
      strike,
      expiry,
      b.time,
      b.iv * 2,
      r.settings,
    );
  const p = enter(r, {
    type: "call",
    strike,
    expiry,
    qty: 1,
    stop: 0.01,
    target: 100,
  });
  assert.equal(p.entry, display.ask + r.settings.slippage);
  assert.equal(replayLots(r, { type: "call", strike, expiry }).length, 1);
  assert.throws(() =>
    checkReplayOrder(r, {
      contract: { type: "put", strike, expiry },
      side: "sell",
      qty: 1,
      kind: "Market",
      lot: p.id + "missing",
    }),
  );
});
test("display settings, selected context and pending orders survive validated restore", () => {
  const s = fresh();
  s.settings.chainDisplay = {
    mode: "advanced",
    sort: "asc",
    columns: ["bid", "ask", "gamma"],
  };
  submitPracticeOrder(s, { ...order(s), kind: "Limit", limit: 1 }, () => ({
    bid: 1.9,
    ask: 2,
  }));
  const out = restore(JSON.stringify(s));
  assert.deepEqual(out.settings.chainDisplay, s.settings.chainDisplay);
  assert.deepEqual(out.chainOrders, s.chainOrders);
  assert.throws(() =>
    validDisplay({ mode: "advanced", sort: "asc", columns: ["<script>"] }),
  );
  out.settings.chainDisplay.columns.push("unsupported");
  assert.throws(() => restore(JSON.stringify(out)));
});

test("practice journal retains every partial close and accumulated realized P/L", () => {
  const s = fresh(),
    o = { ...order(s), qty: 2 },
    get = () => ({ bid: 1.9, ask: 2 });
  submitPracticeOrder(s, o, get);
  const lot = practiceLots(s, o.contract)[0];
  submitPracticeOrder(
    s,
    { ...o, side: "sell", qty: 1, lot: lot.id, reason: "First close" },
    get,
  );
  assert.equal(s.journal[0].details.remainingQuantity, 1);
  submitPracticeOrder(
    s,
    { ...o, side: "sell", qty: 1, lot: lot.id, reason: "Final close" },
    get,
  );
  const j = s.journal[0].details;
  assert.equal(j.closes.length, 2);
  assert.equal(j.realizedPnl, -20);
  assert.equal(j.remainingQuantity, 0);
  assert.equal(j.closes[0].reason, "First close");
  assert.deepEqual(
    restore(JSON.stringify(s)).journal[0].details.closes,
    j.closes,
  );
});
test("chain adapters reject unsupported order types, invalid limits and mismatched replay lots", () => {
  const s = fresh(),
    o = order(s),
    get = () => ({ bid: 1.9, ask: 2 });
  assert.throws(() => checkPracticeOrder(s, { ...o, kind: "Stop" }, get));
  assert.throws(() =>
    checkPracticeOrder(s, { ...o, kind: "Limit", limit: -1 }, get),
  );
  const r = newReplay(),
    b = visible(r).at(-1),
    p = enter(r, {
      type: "call",
      strike: 100,
      expiry: b.time + 21 * 86400000,
      qty: 1,
      stop: 0.01,
      target: 100,
    });
  assert.throws(() =>
    checkReplayOrder(r, {
      contract: { type: "put", strike: 100, expiry: p.expiry },
      side: "sell",
      qty: 1,
      kind: "Market",
      lot: p.id,
    }),
  );
  assert.throws(() => checkReplayOrder(r, { ...o, kind: "Stop" }));
});
