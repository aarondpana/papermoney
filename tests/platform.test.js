import test from "node:test";
import assert from "node:assert/strict";
import {
  scenario,
  aggregate,
  indicators,
  modelQuote,
  positionSize,
  newReplay,
  visible,
  enter,
  exit,
  advance,
  queueOrder,
  equity,
  strategy,
  backtest,
  analytics,
  validateDataset,
  importDataset,
  freshPlatform,
  validatePlatform,
  defaults,
  signal,
} from "../dist/platform-engine.js";
import { price } from "../dist/pricing.js";
import { fresh, restore, save, load } from "../dist/storage.js";
import {
  hourlyLessons,
  library,
  patternFigure,
  contractExercise,
  advancedQuestion,
  categories,
} from "../dist/hourly-content.js";
import { marketChart, bindCrosshair } from "../dist/platform-charts.js";
test("fractional days, rates, dividends and put-call parity", () => {
  const c = price("call", 100, 100, 365, 0.2, 0.05, 0.02),
    p = price("put", 100, 100, 365, 0.2, 0.05, 0.02);
  assert.ok(Math.abs(c - 9.227) < 0.002);
  assert.ok(
    Math.abs(c - p - (100 * Math.exp(-0.02) - 100 * Math.exp(-0.05))) < 1e-8,
  );
  assert.notEqual(
    price("call", 100, 100, 1, 0.3),
    price("call", 100, 100, 1 + 1 / 24, 0.3),
  );
  assert.equal(price("put", 90, 100, 0, 0.3, 0.05, 0.02), 10);
  assert.throws(() => price("call", 100, 100, 1, 10));
});
test("Greeks approximate local sensitivity and near-expiry remains finite", () => {
  const q = modelQuote("call", 100, 100, 21 * 86400000, 0, 0.3);
  assert.ok(q.delta > 0.4 && q.delta < 0.7);
  assert.ok(q.gamma > 0);
  assert.ok(q.theta < 0);
  assert.ok(q.vega > 0);
  const exp = modelQuote("put", 100, 100, 0, 0, 0.3);
  assert.equal(exp.mid, 0);
  for (const [key, n] of Object.entries(exp))
    if (key !== "liquidity") assert.ok(Number.isFinite(n));
});
test("seeded market determinism, gaps, weekends and valid OHLC", () => {
  assert.deepEqual(scenario(44), scenario(44));
  assert.notDeepEqual(scenario(44), scenario(45));
  const bs = scenario(4, "Overnight gaps");
  validateDataset({ name: "test", kind: "synthetic", bars: bs });
  assert.equal(bs.length, 1144);
  assert.ok(bs.every((b) => ![0, 6].includes(new Date(b.time).getUTCDay())));
  assert.ok(bs.some((b, i) => i && b.time - bs[i - 1].time > 24 * 36e5));
});
test("candle aggregation conserves OHLCV and sessions, shortened hourly close", () => {
  const bs = scenario(1).slice(0, 26),
    hour = aggregate(bs, 60),
    day = aggregate(bs, 390);
  assert.equal(hour.length, 7);
  assert.equal(hour.at(-1).count, 2);
  assert.equal(day.length, 1);
  assert.equal(day[0].open, bs[0].open);
  assert.equal(day[0].close, bs.at(-1).close);
  assert.equal(
    day[0].volume,
    bs.reduce((n, b) => n + b.volume, 0),
  );
  assert.equal(day[0].high, Math.max(...bs.map((b) => b.high)));
});
test("prefix aggregation and indicators cannot use future bars", () => {
  const bs = scenario(3),
    prefix = bs.slice(0, 524),
    altered = structuredClone(bs);
  altered.slice(524).forEach((b) => {
    b.close = b.open = b.high = b.low = 10000;
  });
  assert.deepEqual(
    indicators(aggregate(prefix, 60)),
    indicators(aggregate(altered.slice(0, 524), 60)),
  );
  const svg = marketChart(aggregate(prefix, 60).slice(-40));
  assert.ok(!svg.includes("10000"));
  assert.ok(!svg.includes(new Date(bs[600].time).toISOString()));
});
test("indicator known flat series, warm-up and VWAP resets", () => {
  const b = Array.from({ length: 210 }, (_, i) => ({
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 10,
      session: i < 209 ? "a" : "b",
    })),
    v = indicators(b);
  assert.equal(v.ema9[7], null);
  assert.equal(v.ema9[8], 100);
  assert.equal(v.sma50[48], null);
  assert.equal(v.sma200[199], 100);
  assert.equal(v.rsi[20], 50);
  b[209].close = 110;
  b[209].high = 111;
  const next = indicators(b);
  assert.equal(next.vwap[209], (111 + 99 + 110) / 3);
  assert.ok(next.atr14[209] > 2);
});
test("risk sizing distinguishes planned stop and full premium including fees", () => {
  const s = positionSize(10000, 1, 2, 1, 0);
  assert.equal(s.quantity, 1);
  assert.equal(s.plannedPerContract, 100);
  assert.equal(s.maxPerContract, 200);
  assert.equal(positionSize(10000, 1, 2, 1, 0.65).quantity, 0);
  assert.throws(() => positionSize(10000, 1, 1, 2));
});
const order = (r) => {
  const b = visible(r).at(-1);
  return {
    type: "call",
    strike: Math.round(b.close),
    expiry: b.time + 21 * 86400000,
    qty: 1,
    stop: 0.01,
    target: 100,
    reason: "test plan",
  };
};
test("replay ask entry, bid exit, multiplier and exact accounting", () => {
  const r = newReplay(),
    o = order(r),
    q = modelQuote(
      o.type,
      visible(r).at(-1).close,
      o.strike,
      o.expiry,
      visible(r).at(-1).time,
      0.3,
      r.settings,
    ),
    p = enter(r, o);
  assert.equal(p.entry, q.ask + r.settings.slippage);
  assert.equal(p.cost, Math.round((p.entry * 100 + 0.65) * 100) / 100);
  const t = exit(r, p.id);
  assert.equal(r.cash, 10000 + t.pnl);
  assert.equal(r.realized, t.pnl);
  assert.ok(t.pnl < 0);
  assert.equal(r.positions.length, 0);
  assert.throws(() => exit(r, p.id));
});
test("invalid orders and insufficient capital do not mutate account", () => {
  const r = newReplay(),
    snapshot = JSON.stringify(r);
  assert.throws(() => enter(r, { ...order(r), qty: 100 }));
  assert.equal(JSON.stringify(r), snapshot);
  assert.throws(() => enter(r, { ...order(r), type: "short" }));
  assert.throws(() => enter(r, { ...order(r), stop: 1000 }));
});
test("market advances and option time decays; queued limit uses later quotes only", () => {
  const r = newReplay(),
    o = order(r);
  queueOrder(r, { ...o, stop: 0, limit: 0.01 });
  assert.equal(r.positions.length, 0);
  const time = visible(r).at(-1).time;
  advance(r, 4);
  assert.ok(visible(r).at(-1).time > time);
  assert.equal(r.positions.length, 0);
  assert.equal(r.orders.length, 1);
  const fillReplay = newReplay();
  const fillOrder = { ...order(fillReplay), stop: 0, limit: 10, target: 1000 };
  queueOrder(fillReplay, fillOrder);
  const placed = visible(fillReplay).at(-1).time;
  advance(fillReplay, 1);
  assert.equal(fillReplay.orders.length, 0);
  assert.equal(fillReplay.positions.length, 1);
  assert.ok(fillReplay.positions[0].entryTime > placed);
  assert.ok(fillReplay.positions[0].entry <= fillOrder.limit);
});
test("stop wins ambiguous intrabar touches and accounting persists", () => {
  let r, p;
  for (let seed = 1; seed <= 100; seed++) {
    const candidate = newReplay(seed),
      position = enter(candidate, order(candidate)),
      bar = scenario(seed)[candidate.cursor];
    const at = (spot) =>
      modelQuote(
        position.type,
        spot,
        position.strike,
        position.expiry,
        bar.time,
        bar.iv,
        candidate.settings,
      ).bid;
    const lo = at(bar.low),
      hi = at(bar.high);
    if (lo < position.entry && hi > position.entry) {
      r = candidate;
      p = position;
      p.stop = (lo + p.entry) / 2;
      p.target = (hi + p.entry) / 2;
      break;
    }
  }
  assert.ok(r, "A valid synthetic OHLC bar spans both management levels");
  assert.ok(p.stop < p.entry && p.target > p.entry);
  const events = advance(r, 1);
  assert.equal(events.length, 1);
  assert.match(events[0].exitReason, /stop/i);
  assert.ok(r.cash >= 0);
  assert.equal(r.trades.length, 1);
});
test("expiry cash settlement and no repeated position settlement", () => {
  const r = newReplay(),
    o = order(r);
  o.expiry = visible(r).at(-1).time + 1;
  enter(r, o);
  advance(r, 1);
  assert.equal(r.positions.length, 0);
  assert.match(r.trades[0].exitReason, /expiry/i);
  advance(r, 1);
  assert.equal(r.trades.length, 1);
});
test("empty, all winning, all losing analytics and closed-trade drawdown", () => {
  assert.equal(analytics([]).expectancy, null);
  assert.equal(analytics([]).profitFactor, null);
  const a = analytics([{ pnl: 100 }, { pnl: -50 }, { pnl: -50 }, { pnl: 40 }]);
  assert.equal(a.expectancy, 10);
  assert.equal(a.profitFactor, 1.4);
  assert.equal(a.maxLosses, 2);
  assert.ok(a.maxDrawdown > 0);
  assert.equal(analytics([{ pnl: 1 }]).profitFactor, null);
  assert.equal(analytics([{ pnl: -1 }]).profitFactor, 0);
});
test("dataset validation rejects bad ordering, OHLC, missing quotes and malformed CSV", () => {
  const data = {
    name: "input",
    kind: "underlying-only",
    bars: scenario(1).slice(0, 104),
  };
  assert.equal(validateDataset(data), data);
  const bad = structuredClone(data);
  bad.bars[1].time = bad.bars[0].time;
  assert.throws(() => validateDataset(bad));
  bad.bars[1].time++;
  bad.bars[1].high = 0;
  assert.throws(() => validateDataset(bad));
  assert.throws(() => validateDataset({ ...data, kind: "option-quotes" }));
  assert.throws(() => importDataset("foo,bar\n1,2", "bad"));
  assert.deepEqual(importDataset(JSON.stringify(data), "input"), data);
});
test("backtest reproducibility, signal close / next open, chronological split", () => {
  const data = {
      name: "Synthetic",
      kind: "synthetic",
      bars: scenario(9, "Uptrend"),
    },
    s = strategy();
  s.trend = false;
  s.volume = 0;
  s.riskPercent = 3;
  s.entryRule = "pullback";
  const a = backtest(data, s),
    b = backtest(data, s);
  assert.deepEqual(a, b);
  assert.ok(a.trades.length > 0);
  assert.ok(
    a.trades.every((t) => t.exitTime >= t.entryTime && Number.isFinite(t.pnl)),
  );
  assert.ok(a.trades.every((t) => t.cost > 0 && t.fees > 0));
  const out = backtest(data, s, { start: 0.7, end: 1 });
  assert.ok(out.from >= Math.floor(aggregate(data.bars, 60).length * 0.7));
  assert.ok(
    out.trades.every(
      (t) => t.entryTime >= aggregate(data.bars, 60)[out.from].time,
    ),
  );
});
test("strategy persistence and v2 extension preserves original accounts and lessons", () => {
  const original = fresh(),
    old = structuredClone(original);
  delete old.platform;
  old.completed = ["stocks-options"];
  const migrated = restore(JSON.stringify(old));
  assert.deepEqual(migrated.accounts, old.accounts);
  assert.deepEqual(migrated.completed, old.completed);
  assert.equal(migrated.platform.version, 1);
  migrated.platform.strategies.push({ ...strategy(), id: "stable" });
  enter(migrated.platform.replay, order(migrated.platform.replay));
  const storage = {
    value: null,
    setItem(k, v) {
      this.value = v;
    },
    getItem() {
      return this.value;
    },
  };
  save(storage, migrated);
  assert.deepEqual(load(storage).state, migrated);
  assert.equal(
    equity(load(storage).state.platform.replay),
    equity(migrated.platform.replay),
  );
});
test("new curriculum and library content present with independent hourly charts", () => {
  assert.equal(hourlyLessons.length, 15);
  for (const l of hourlyLessons) {
    assert.ok(
      l.theory.length > 100 &&
        l.example &&
        l.success &&
        l.failure &&
        l.application,
    );
    assert.equal(l.checks.length, 2);
  }
  assert.equal(library.length, 42);
  assert.notDeepEqual(patternFigure(0).bars, patternFigure(1).bars);
  assert.ok(
    patternFigure(0).bars.some(
      (b, i, a) => i && b.session !== a[i - 1].session,
    ),
  );
});
test("platform validation rejects unknown schemas and malformed replay", () => {
  assert.throws(() => validatePlatform({ ...freshPlatform(), version: 99 }));
  const p = freshPlatform();
  p.replay.cash = -1;
  assert.throws(() => validatePlatform(p));
});
test("contract exercise answers are supported by displayed modeled chains", () => {
  const bull = contractExercise(0),
    a = bull.chain[bull.correct];
  assert.equal(a.type, "call");
  assert.ok(
    a.days >= 14 &&
      a.days <= 30 &&
      a.delta >= 0.5 &&
      a.delta <= 0.7 &&
      a.ask * 100 <= 400,
  );
  const bear = contractExercise(1),
    b = bear.chain[bear.correct];
  assert.equal(b.type, "put");
  assert.ok(Math.abs(b.delta) >= 0.5);
  assert.equal(contractExercise(2).correct, 4);
  assert.equal(contractExercise(5).answer, 306.65);
  const v = contractExercise(8);
  assert.equal(
    v.chain[v.correct].vega,
    Math.max(...v.chain.map((c) => c.vega)),
  );
  const g = contractExercise(9);
  assert.equal(
    g.chain[g.correct].gamma,
    Math.max(...g.chain.map((c) => c.gamma)),
  );
});
test("advanced tasks include bounded level answers, no-trade decisions and distinct intervals", () => {
  for (let i = 0; i < 12; i++) {
    const q = advancedQuestion(categories[1], i);
    assert.ok(Number.isFinite(q.answer));
    assert.ok(q.tolerance >= 0);
  }
  const hour = advancedQuestion(categories[0], 0, "1 hour"),
    minute = advancedQuestion(categories[0], 0, "1 minute");
  assert.notDeepEqual(hour.chart.bars, minute.chart.bars);
  assert.ok(
    hour.chart.bars[1].time - hour.chart.bars[0].time >
      minute.chart.bars[1].time - minute.chart.bars[0].time,
  );
  assert.match(advancedQuestion(categories[0], 12).options[0], /No qualifying/);
});
test("risk and concurrent-position limits reject entries before mutation", () => {
  const r = newReplay();
  assert.throws(() => enter(r, { ...order(r), riskPercent: 0.01 }), /budget/);
  r.settings.maxPositions = 1;
  enter(r, order(r));
  const copy = JSON.stringify(r);
  assert.throws(() => enter(r, order(r)), /limit/);
  assert.equal(JSON.stringify(r), copy);
});
test("gap stop fills no better than worse opening bid and records slippage", () => {
  const r = newReplay(2, "Overnight gaps"),
    o = order(r),
    t = enter(r, o),
    b = scenario(r.seed, r.regime)[r.cursor],
    opening = modelQuote(
      t.type,
      b.open,
      t.strike,
      t.expiry,
      b.time,
      b.iv,
      r.settings,
    ).bid;
  t.stop = (opening + t.entry) / 2;
  t.target = 1000;
  const trades = advance(r, 1);
  assert.equal(trades.length, 1);
  assert.ok(trades[0].exit <= opening);
  assert.ok(trades[0].exit <= t.stop);
  assert.ok(trades[0].slippage > 0);
});
test("future bars do not change earlier backtest decisions and exits", () => {
  const data = { name: "prefix audit", kind: "synthetic", bars: scenario(8) },
    changed = structuredClone(data),
    cut = data.bars[800].time;
  for (const b of changed.bars.slice(801)) {
    b.open = b.close = 200;
    b.high = 201;
    b.low = 199;
  }
  const s = strategy();
  s.trend = false;
  s.volume = 0;
  s.riskPercent = 3;
  s.entryRule = "pullback";
  const before = backtest(data, s).trades.filter((t) => t.exitTime <= cut),
    after = backtest(changed, s).trades.filter((t) => t.exitTime <= cut);
  assert.ok(before.length > 0);
  assert.deepEqual(after, before);
});
test("historical import rejects missing base bars and detects New York DST session slots", () => {
  const bars = scenario(2)
    .slice(0, 52)
    .map((b) => ({ ...b, time: b.time + 70 * 86400000 }));
  const data = {
    name: "summer import",
    kind: "underlying-only",
    bars: scenario(2)
      .slice(0, 52)
      .map((b) => ({ ...b, time: b.time + 70 * 86400000 - 3600000 })),
  };
  validateDataset(data);
  assert.equal(data.bars[0].slot, 0);
  const broken = structuredClone(data);
  broken.bars.splice(5, 1);
  assert.throws(() => validateDataset(broken), /Missing/);
  assert.throws(
    () =>
      validateDataset({ name: "bad summer", kind: "underlying-only", bars }),
    /session|sessions/,
  );
});
test("older platform settings migrate and malformed stored metrics are rejected", () => {
  const s = fresh();
  delete s.platform.replay.settings.dailyLoss;
  delete s.platform.replay.settings.maxPositions;
  const migrated = restore(JSON.stringify(s));
  assert.equal(migrated.platform.replay.settings.dailyLoss, 3);
  const data = { name: "test", kind: "synthetic", bars: scenario(1) },
    run = backtest(data, strategy());
  migrated.platform.runs.push(run);
  migrated.platform.runs[0].metrics.count = "<img src=x onerror=alert(1)>";
  assert.throws(() => restore(JSON.stringify(migrated)), /metric/);
});
test("crosshair pointer updates both endpoints and its accessible readout", () => {
  const makeLine = () => ({
      attrs: {},
      setAttribute(k, v) {
        this.attrs[k] = v;
      },
    }),
    x = makeLine(),
    y = makeLine(),
    readout = { textContent: "" };
  const svg = {
    id: "marketSvg",
    dataset: { lo: "90", hi: "110" },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 760, height: 390 }),
    querySelector: (s) =>
      s === "[data-cross-x]" ? x : s === "[data-cross-y]" ? y : null,
  };
  const previous = globalThis.document;
  globalThis.document = {
    querySelector: (s) =>
      s === "#marketSvg" ? svg : s === "#marketSvg-readout" ? readout : null,
  };
  try {
    bindCrosshair([{ time: 1000 }, { time: 2000 }]);
    svg.onpointermove({ clientX: 380, clientY: 150 });
    assert.equal(x.attrs.x1, x.attrs.x2);
    assert.equal(y.attrs.y1, y.attrs.y2);
    assert.match(readout.textContent, /USD/);
    assert.match(readout.textContent, /1970/);
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
});
