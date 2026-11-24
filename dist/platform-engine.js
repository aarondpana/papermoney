import { liquidityQuote } from "./chain-model.js?v=382f06ff093b";
// Deterministic educational simulation. No historical prices or broker fills.
import { price, intrinsic, money } from "./pricing.js?v=382f06ff093b";
const newYorkClock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
export const finite = (n, min = -1e15, max = 1e15) =>
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
export function number(n, min, max, label = "number") {
  n = Number(n);
  if (!finite(n, min, max)) throw Error("Invalid " + label);
  return n;
}
export const seeded = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const regimes = [
  "Mixed",
  "Uptrend",
  "Downtrend",
  "Sideways",
  "High volatility",
  "Low volatility",
  "Failed breakout",
  "Successful breakout",
  "Overnight gaps",
  "Trend reversal",
  "Choppy",
  "Earnings-like",
];
// Base bars are completed 15-minute intervals, 26 per synthetic NY session.
// Fixed EST season avoids DST ambiguity; weekends skipped, holidays not modeled.
export function scenario(seed = 41, regime = "Mixed", sessions = 44) {
  if (!Number.isInteger(seed) || !regimes.includes(regime))
    throw Error("Invalid scenario");
  const rand = seeded(seed),
    bars = [];
  let spot = 100,
    date = new Date("2026-01-05T00:00:00Z");
  for (let day = 0; day < sessions; day++) {
    while ([0, 6].includes(date.getUTCDay()))
      date.setUTCDate(date.getUTCDate() + 1);
    const key = date.toISOString().slice(0, 10),
      event = day === 28,
      highVol =
        regime === "High volatility" || (regime === "Earnings-like" && event);
    spot *= 1 + (rand() - 0.5) * (regime === "Overnight gaps" ? 0.07 : 0.012);
    for (let slot = 0; slot < 26; slot++) {
      let drift =
        regime === "Uptrend"
          ? 0.0006
          : regime === "Downtrend"
            ? -0.0006
            : regime === "Trend reversal"
              ? day < 25
                ? 0.0008
                : -0.0008
              : 0;
      if (regime === "Mixed") drift = Math.sin(day / 5) * 0.0005;
      if (regime === "Failed breakout" && day === 27)
        drift = slot < 12 ? 0.002 : -0.003;
      if (regime === "Successful breakout" && day >= 27 && day < 31)
        drift = 0.001;
      const vol = highVol
        ? 0.009
        : regime === "Low volatility"
          ? 0.0008
          : regime === "Choppy"
            ? 0.005
            : 0.003;
      const open = spot,
        close = Math.max(1, open * (1 + drift + (rand() - 0.5) * vol * 2));
      const high = Math.max(open, close) * (1 + rand() * vol * 0.4),
        low = Math.min(open, close) * (1 - rand() * vol * 0.4);
      const time = Date.parse(key + "T14:30:00Z") + (slot + 1) * 900000;
      bars.push({
        time,
        session: key,
        slot,
        open,
        high,
        low,
        close,
        volume: Math.round(50000 + rand() * 150000) * (highVol ? 3 : 1),
        iv:
          regime === "Earnings-like"
            ? day < 28
              ? 0.65
              : 0.24
            : highVol
              ? 0.6
              : 0.3,
      });
      spot = close;
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return bars;
}
export function validateDataset(data) {
  if (
    !data ||
    !["synthetic", "underlying-only", "option-quotes"].includes(data.kind) ||
    typeof data.name !== "string" ||
    !Array.isArray(data.bars) ||
    data.bars.length < 30 ||
    data.bars.length > 30000
  )
    throw Error("Dataset needs a type, name and 30–30,000 bars");
  let prev = -Infinity;
  for (const b of data.bars) {
    if (
      !finite(b.time, 0) ||
      b.time <= prev ||
      !["open", "high", "low", "close"].every((k) => finite(b[k], 0.000001)) ||
      !finite(b.volume, 0) ||
      b.high < Math.max(b.open, b.close) ||
      b.low > Math.min(b.open, b.close) ||
      b.high < b.low
    )
      throw Error("Invalid or unordered OHLCV data");
    prev = b.time;
    if (!b.session) b.session = new Date(b.time).toISOString().slice(0, 10);
  }
  for (let i = 0; i < data.bars.length; i++) {
    const b = data.bars[i],
      previous = data.bars[i - 1];
    if (data.kind !== "synthetic") {
      const parts = Object.fromEntries(
        newYorkClock
          .formatToParts(new Date(b.time))
          .map((p) => [p.type, p.value]),
      );
      b.session = parts.year + "-" + parts.month + "-" + parts.day;
      b.slot = (Number(parts.hour) * 60 + Number(parts.minute) - 570) / 15 - 1;
      if (!Number.isInteger(b.slot) || b.slot < 0 || b.slot > 25)
        throw Error(
          "Import requires completed 15-minute US regular-session bars (09:45–16:00 New York)",
        );
    }
    if (
      previous &&
      b.session === previous.session &&
      b.time - previous.time !== 900000
    )
      throw Error(
        "Missing or unsupported intraday intervals; provide consecutive 15-minute bars",
      );
    if (
      data.kind !== "synthetic" &&
      (!previous || b.session !== previous.session) &&
      (b.slot !== 0 || (previous && previous.slot !== 25))
    )
      throw Error(
        "Import sessions must start at 09:30 and prior sessions must be complete",
      );
  }
  if (data.kind === "option-quotes") {
    if (!Array.isArray(data.quotes) || !data.quotes.length)
      throw Error("Historical options mode requires actual quote rows");
    for (const q of data.quotes)
      if (
        !finite(q.time, 0) ||
        !["call", "put"].includes(q.type) ||
        !finite(q.strike, 0.01) ||
        !finite(q.expiry, q.time) ||
        !finite(q.bid, 0) ||
        !finite(q.ask, q.bid)
      )
        throw Error("Invalid historical option quote");
  }
  return data;
}
export function importDataset(text, name) {
  if (text.length > 8e6) throw Error("Dataset exceeds 8 MB");
  if (text.trim().startsWith("{")) return validateDataset(JSON.parse(text));
  const lines = text.trim().split(/\r?\n/),
    headers = lines
      .shift()
      .split(",")
      .map((s) => s.trim());
  if (
    !["time", "open", "high", "low", "close", "volume"].every((k) =>
      headers.includes(k),
    )
  )
    throw Error("CSV columns: time,open,high,low,close,volume");
  return validateDataset({
    name,
    kind: "underlying-only",
    bars: lines.map((line) => {
      const v = line.split(","),
        b = Object.fromEntries(headers.map((k, i) => [k, v[i]]));
      return {
        time: Date.parse(b.time),
        session: b.time.slice(0, 10),
        ...Object.fromEntries(
          ["open", "high", "low", "close", "volume"].map((k) => [
            k,
            Number(b[k]),
          ]),
        ),
      };
    }),
  });
}
export function aggregate(bars, minutes = 60) {
  if (![15, 60, 240, 390].includes(minutes))
    throw Error("Unsupported timeframe");
  const out = [];
  for (const b of bars) {
    const minute =
        b.slot !== undefined
          ? b.slot * 15
          : new Date(b.time).getUTCHours() * 60 +
            new Date(b.time).getUTCMinutes() -
            870 -
            1,
      key = b.session + ":" + Math.floor(Math.max(0, minute) / minutes);
    let a = out.at(-1);
    if (!a || a.key !== key) {
      a = { ...b, key, count: 0 };
      out.push(a);
    }
    a.high = Math.max(a.high, b.high);
    a.low = Math.min(a.low, b.low);
    a.close = b.close;
    a.volume = a.count ? a.volume + b.volume : b.volume;
    a.time = b.time;
    a.iv = b.iv;
    a.count++;
  }
  return out;
}
export function indicators(bars, { fast = 9, slow = 20, sma = 50 } = {}) {
  const closes = bars.map((b) => b.close),
    ema = (p) => {
      let v;
      return closes.map((c, i) => {
        v = i ? (c * 2) / (p + 1) + v * (1 - 2 / (p + 1)) : c;
        return i + 1 >= p ? v : null;
      });
    },
    avg = (p) =>
      closes.map((_, i) =>
        i + 1 < p
          ? null
          : closes.slice(i - p + 1, i + 1).reduce((a, b) => a + b, 0) / p,
      );
  let pv = 0,
    volume = 0,
    session = "",
    atr = 0,
    gain = 0,
    loss = 0;
  const vwap = [],
    atr14 = [],
    rsi = [];
  bars.forEach((b, i) => {
    if (b.session !== session) {
      pv = volume = 0;
      session = b.session;
    }
    pv += ((b.high + b.low + b.close) / 3) * b.volume;
    volume += b.volume;
    vwap.push(volume ? pv / volume : null);
    const tr = Math.max(
      b.high - b.low,
      i ? Math.abs(b.high - bars[i - 1].close) : 0,
      i ? Math.abs(b.low - bars[i - 1].close) : 0,
    );
    atr = i < 14 ? atr + tr : (atr * 13) / 14 + tr / 14;
    atr14.push(i < 13 ? null : i === 13 ? (atr /= 14) : atr);
    if (i) {
      const d = b.close - bars[i - 1].close;
      gain =
        i <= 14
          ? gain + Math.max(0, d)
          : (gain * 13) / 14 + Math.max(0, d) / 14;
      loss =
        i <= 14
          ? loss + Math.max(0, -d)
          : (loss * 13) / 14 + Math.max(0, -d) / 14;
      if (i === 14) {
        gain /= 14;
        loss /= 14;
      }
    }
    rsi.push(
      i < 14 ? null : loss ? 100 - 100 / (1 + gain / loss) : gain ? 100 : 50,
    );
  });
  return {
    ema9: ema(fast),
    ema20: ema(slow),
    sma50: avg(sma),
    sma200: avg(200),
    vwap,
    atr14,
    rsi,
  };
}
export const defaults = {
  spread: 0.05,
  commission: 0.65,
  slippage: 0.01,
  liquidity: 20,
  rate: 0.04,
  dividend: 0,
  iv: 0.3,
  dailyLoss: 3,
  maxPositions: 3,
};
export function modelQuote(
  type,
  spot,
  strike,
  expiry,
  time,
  iv = 0.3,
  settings = defaults,
) {
  const d = Math.max(0, (expiry - time) / 86400000),
    r = settings.rate ?? 0.04,
    q = settings.dividend ?? 0;
  const mid = price(type, spot, strike, d, iv, r, q),
    step = Math.max(0.001, spot * 0.0001),
    p = (s) => price(type, s, strike, d, iv, r, q),
    delta = (p(spot + step) - p(Math.max(0.00001, spot - step))) / (2 * step),
    gamma =
      (p(spot + step) - 2 * mid + p(Math.max(0.00001, spot - step))) /
      step ** 2;
  const half = d ? Math.max(0.01, (mid * (settings.spread ?? 0.05)) / 2) : 0;
  return liquidityQuote(
    {
      mid,
      bid: money(Math.max(0, mid - half)),
      ask: money(mid + half),
      delta,
      gamma,
      theta: price(type, spot, strike, Math.max(0, d - 1), iv, r, q) - mid,
      vega: price(type, spot, strike, d, iv + 0.01, r, q) - mid,
      intrinsic: intrinsic(type, spot, strike),
      extrinsic: Math.max(0, mid - intrinsic(type, spot, strike)),
      days: d,
    },
    { ticker: "DEMO", type, strike, expiry, time },
    settings.spread ?? 0.05,
  );
}
export function positionSize(equity, riskPercent, entry, stop, fee = 0.65) {
  [equity, riskPercent, entry, stop, fee].forEach((n, i) =>
    number(n, 0, i === 1 ? 100 : 1e9),
  );
  if (entry <= stop || entry <= 0)
    throw Error("Premium stop must be below entry");
  return {
    quantity: Math.max(
      0,
      Math.floor(
        Math.min(
          (equity * riskPercent) / 100 / ((entry - stop) * 100 + fee * 2),
          equity / (entry * 100 + fee),
        ),
      ),
    ),
    plannedPerContract: (entry - stop) * 100 + fee * 2,
    maxPerContract: entry * 100 + fee,
  };
}
export function newReplay(seed = 41, regime = "Mixed", capital = 10000) {
  if (!Number.isInteger(seed) || !regimes.includes(regime))
    throw Error("Invalid replay seed or regime");
  number(capital, 100, 1e8, "capital");
  return {
    runId: crypto.randomUUID(),
    seed,
    regime,
    cursor: 520,
    initial: capital,
    cash: capital,
    realized: 0,
    positions: [],
    orders: [],
    trades: [],
    equity: [],
    drawings: [],
    settings: { ...defaults },
    nextId: 1,
  };
}
export const visible = (r) => scenario(r.seed, r.regime).slice(0, r.cursor);
export function chain(r) {
  const b = visible(r).at(-1),
    expiry = b.time + 21 * 86400000,
    center = Math.round(b.close / 2) * 2;
  return Array.from({ length: 7 }, (_, i) =>
    ["call", "put"].map((type) => ({
      type,
      strike: center + (i - 3) * 2,
      expiry,
      ...modelQuote(
        type,
        b.close,
        center + (i - 3) * 2,
        expiry,
        b.time,
        (b.iv || 0.3) * (r.settings.iv / 0.3),
        r.settings,
      ),
    })),
  ).flat();
}
export function equity(r) {
  const b = visible(r).at(-1);
  return (
    r.cash +
    r.positions.reduce(
      (n, p) =>
        n +
        modelQuote(
          p.type,
          b.close,
          p.strike,
          p.expiry,
          b.time,
          (b.iv || 0.3) * (r.settings.iv / 0.3),
          r.settings,
        ).mid *
          p.qty *
          100,
      0,
    )
  );
}
export function enter(r, order) {
  const b = visible(r).at(-1),
    qty = number(order.qty, 1, 100, "quantity");
  if (!Number.isInteger(qty) || qty > r.settings.liquidity)
    throw Error("Quantity exceeds simulated liquidity");
  if (!["call", "put"].includes(order.type))
    throw Error("Long call or put required");
  number(order.strike, 0.01, 1e6);
  number(order.expiry, b.time + 1, b.time + 365 * 86400000);
  const q = modelQuote(
      order.type,
      b.close,
      order.strike,
      order.expiry,
      b.time,
      (b.iv || 0.3) * (r.settings.iv / 0.3),
      r.settings,
    ),
    fill = q.ask + r.settings.slippage,
    cost = money(fill * qty * 100 + r.settings.commission * qty);
  if (
    cost + r.settings.commission * qty >
    r.cash - r.positions.reduce((n, p) => n + r.settings.commission * p.qty, 0)
  )
    throw Error("Insufficient replay cash including reserved exit fees");
  if (r.positions.length >= (r.settings.maxPositions ?? 3))
    throw Error("Replay concurrent-position limit reached");
  const dailyNet = r.trades
    .filter(
      (t) => new Date(t.exitTime).toISOString().slice(0, 10) === b.session,
    )
    .reduce((n, t) => n + t.pnl, 0);
  if (dailyNet <= (-r.initial * (r.settings.dailyLoss ?? 3)) / 100)
    throw Error("Replay daily realized-loss limit reached");
  const stop = number(order.stop, 0, fill, "premium stop"),
    target = number(order.target, fill, 1e6, "premium target");
  if (stop >= fill || target <= fill)
    throw Error("Stop < entry < target required");
  if (
    order.riskPercent !== undefined &&
    (fill - stop) * qty * 100 + r.settings.commission * qty * 2 >
      (equity(r) * number(order.riskPercent, 0.01, 10, "risk percent")) / 100
  )
    throw Error(
      "Planned risk exceeds the budget; calculate size or choose no trade",
    );
  const p = {
    ...order,
    id: "replay-" + (r.runId || r.seed) + "-" + r.nextId++,
    qty,
    entry: fill,
    entryTime: b.time,
    entrySpot: b.close,
    entryGreeks: q,
    cost,
    plannedRisk: (fill - stop) * qty * 100 + r.settings.commission * qty * 2,
    maxLoss: cost + r.settings.commission * qty,
    stop,
    target,
    source: "synthetic-replay",
    ticker: "DEMO",
    marketCondition: r.regime,
    iv: b.iv * (r.settings.iv / 0.3),
    mfe: 0,
    mae: 0,
    chartState: { seed: r.seed, regime: r.regime, cursor: r.cursor },
    reason: order.reason || "",
    strategy: order.strategy || "Discretionary",
    pattern: order.pattern || "Unclassified",
    timeframe: "1 hour",
  };
  r.cash = money(r.cash - cost);
  r.positions.push(p);
  return p;
}
export function exit(r, id, reason = "Manual exit", forcedPremium) {
  const p = r.positions.find((p) => p.id === id);
  if (!p) throw Error("Position unavailable");
  const b = visible(r).at(-1),
    q = modelQuote(
      p.type,
      b.close,
      p.strike,
      p.expiry,
      b.time,
      (b.iv || 0.3) * (r.settings.iv / 0.3),
      r.settings,
    ),
    fill = Math.max(0, forcedPremium ?? q.bid - r.settings.slippage),
    fees = r.settings.commission * p.qty,
    proceeds = money(fill * p.qty * 100 - fees),
    pnl = money(proceeds - p.cost);
  if (r.cash + proceeds < 0)
    throw Error(
      "Exit fees exceed available replay cash; revise cost assumptions before closing",
    );
  const t = {
    ...p,
    exit: fill,
    exitTime: b.time,
    exitSpot: b.close,
    exitReason: reason,
    exitChartState: { seed: r.seed, regime: r.regime, cursor: r.cursor },
    pnl,
    fees: fees + r.settings.commission * p.qty,
    slippage: r.settings.slippage * p.qty * 200,
    holdingHours: (b.time - p.entryTime) / 36e5,
    rMultiple: p.plannedRisk ? pnl / p.plannedRisk : null,
    adherence: null,
    notes: "",
    mistakes: "",
    lessons: "",
  };
  r.cash = money(r.cash + proceeds);
  r.realized = money(r.realized + pnl);
  r.positions = r.positions.filter((x) => x.id !== id);
  r.trades.push(t);
  return t;
}
export function queueOrder(r, o) {
  number(o.limit, 0.01, 1e6, "limit");
  number(o.qty, 1, r.settings.liquidity, "quantity");
  if (!Number.isInteger(o.qty) || !["call", "put"].includes(o.type))
    throw Error("Invalid limit order");
  number(o.stop, 0, o.limit);
  number(o.target, o.limit, 1e6);
  number(o.strike, 0.01, 1e6);
  number(o.expiry, visible(r).at(-1).time + 1, 1e14);
  if (o.stop >= o.limit || o.target <= o.limit)
    throw Error("Limit stop < entry < target required");
  if (o.riskPercent !== undefined)
    number(o.riskPercent, 0.01, 10, "risk percent");
  r.orders.push({
    ...o,
    id: "limit-" + r.nextId++,
    placed: visible(r).at(-1).time,
  });
}
export function advance(r, count = 1) {
  count = number(count, 1, 104, "candle count");
  if (!Number.isInteger(count))
    throw Error("Advance a whole number of base candles");
  const all = scenario(r.seed, r.regime),
    events = [];
  for (let i = 0; i < count && r.cursor < all.length; i++) {
    r.cursor++;
    const b = all[r.cursor - 1];
    for (const o of [...r.orders]) {
      const q = modelQuote(
        o.type,
        b.close,
        o.strike,
        o.expiry,
        b.time,
        (b.iv || 0.3) * (r.settings.iv / 0.3),
        r.settings,
      );
      if (b.time >= o.expiry) {
        r.orders = r.orders.filter((x) => x.id !== o.id);
        continue;
      }
      if (q.ask + r.settings.slippage <= o.limit) {
        try {
          enter(r, o);
          r.orders = r.orders.filter((x) => x.id !== o.id);
        } catch {
          r.orders = r.orders.filter((x) => x.id !== o.id);
        }
      }
    }
    for (const p of [...r.positions]) {
      const quoteAt = (s) =>
          modelQuote(
            p.type,
            s,
            p.strike,
            p.expiry,
            b.time,
            (b.iv || 0.3) * (r.settings.iv / 0.3),
            r.settings,
          ).bid,
        atOpen = quoteAt(b.open),
        lo = Math.min(quoteAt(b.low), quoteAt(b.high)),
        hi = Math.max(quoteAt(b.low), quoteAt(b.high));
      p.mfe = Math.max(p.mfe, (hi - p.entry) * p.qty * 100);
      p.mae = Math.min(p.mae, (lo - p.entry) * p.qty * 100);
      // Unknown OHLC sequencing: stops win ties. Gap-through stop fills at worse opening bid.
      if (b.time >= p.expiry)
        events.push(
          exit(
            r,
            p.id,
            "Educational expiry cash settlement",
            intrinsic(p.type, b.close, p.strike),
          ),
        );
      else if (lo <= p.stop)
        events.push(
          exit(
            r,
            p.id,
            "Premium stop (stop-first OHLC)",
            Math.max(0, Math.min(p.stop, atOpen) - r.settings.slippage),
          ),
        );
      else if (hi >= p.target)
        events.push(
          exit(
            r,
            p.id,
            "Premium target",
            Math.max(0, p.target - r.settings.slippage),
          ),
        );
    }
    r.equity.push({ time: b.time, value: equity(r) });
  }
  return events;
}
export const templates = [
  "Bull Flag Continuation",
  "Bear Flag Continuation",
  "Support Breakout",
  "Resistance Breakout",
  "Flat Top Breakout",
  "Flat Bottom Breakdown",
  "Moving Average Pullback",
  "Trend Reversal",
  "False Breakout Reversal",
  "Custom Strategy",
];
export function strategy(template = "Bull Flag Continuation") {
  return {
    id: "",
    name: template,
    template,
    watchlist: "SPY, QQQ, AAPL, NVDA, MSFT",
    primary: "1 hour",
    confirmation: "Daily",
    execution: "15 minutes",
    direction: /Bear|Bottom|Support/.test(template) ? "bearish" : "bullish",
    patternCriteria: "3 completed bars; compare prior 8-bar range",
    trend: true,
    volume: 1,
    indicator: "EMA9/20",
    closeConfirmation: true,
    entryRule:
      template === "Moving Average Pullback"
        ? "pullback"
        : template === "Trend Reversal"
          ? "reversal"
          : template === "False Breakout Reversal"
            ? "false-breakout"
            : "breakout",
    stopPercent: 30,
    targetR: 2,
    maxHold: 24,
    overnight: true,
    minDte: 14,
    maxDte: 30,
    minDelta: 0.5,
    maxDelta: 0.7,
    strike: "Delta band",
    maxSpread: 0.12,
    maxIv: 0.8,
    riskPercent: 0.75,
    dailyLoss: 3,
    maxPositions: 1,
    notes:
      "Experimental educational default; not a validated profitable strategy.",
  };
}
export function validateStrategy(s) {
  if (
    !s ||
    !templates.includes(s.template) ||
    typeof s.name !== "string" ||
    !s.name.trim() ||
    s.name.length > 100 ||
    !["bullish", "bearish"].includes(s.direction) ||
    !["breakout", "pullback", "reversal", "false-breakout"].includes(
      s.entryRule,
    ) ||
    s.primary !== "1 hour" ||
    s.confirmation !== "Daily" ||
    s.execution !== "15 minutes"
  )
    throw Error("Unsupported strategy configuration");
  for (const [k, min, max] of [
    ["stopPercent", 1, 90],
    ["targetR", 0.1, 20],
    ["maxHold", 1, 200],
    ["minDte", 1, 365],
    ["maxDte", 1, 365],
    ["minDelta", 0, 1],
    ["maxDelta", 0, 1],
    ["maxSpread", 0, 1],
    ["maxIv", 0.01, 5],
    ["riskPercent", 0.01, 10],
    ["dailyLoss", 0.1, 100],
    ["maxPositions", 1, 10],
    ["volume", 0, 10],
  ]) {
    if (!finite(s[k], min, max)) throw Error("Invalid strategy " + k);
  }
  if (!Number.isInteger(s.maxPositions) || !Number.isInteger(s.maxHold))
    throw Error("Position limit and holding buckets must be whole numbers");
  if (s.minDte > s.maxDte || s.minDelta > s.maxDelta)
    throw Error("Minimum exceeds maximum");
  return s;
}
export function signal(bars, s) {
  if (bars.length < 22) return false;
  const b = bars.at(-1),
    prior = bars.slice(-9, -1),
    up = s.direction === "bullish",
    high = Math.max(...prior.map((b) => b.high)),
    low = Math.min(...prior.map((b) => b.low)),
    ind = indicators(bars),
    a = ind.ema9.at(-1),
    z = ind.ema20.at(-1),
    avg =
      prior.reduce((n, b) => n + b.volume / (b.count || 1), 0) / prior.length;
  if (
    (s.volume && b.volume / (b.count || 1) < avg * s.volume) ||
    (s.trend && (up ? a <= z : a >= z))
  )
    return false;
  if (s.entryRule === "pullback")
    return up
      ? b.low <= a && b.close > a && b.close > b.open
      : b.high >= a && b.close < a && b.close < b.open;
  if (s.entryRule === "reversal")
    return up
      ? b.close > a && bars.at(-2).close <= ind.ema9.at(-2)
      : b.close < a && bars.at(-2).close >= ind.ema9.at(-2);
  if (s.entryRule === "false-breakout")
    return up ? b.low < low && b.close > low : b.high > high && b.close < high;
  return up ? b.close > high : b.close < low;
}
export function analytics(trades, initial = 10000) {
  const values = [initial];
  for (const t of trades) values.push(values.at(-1) + t.pnl);
  let peak = initial,
    drawdown = 0,
    w = 0,
    l = 0,
    maxW = 0,
    maxL = 0;
  const drawdowns = values.map((v) => {
    peak = Math.max(peak, v);
    const d = peak ? (peak - v) / peak : 0;
    drawdown = Math.max(drawdown, d);
    return -100 * d;
  });
  for (const t of trades) {
    w = t.pnl > 0 ? w + 1 : 0;
    l = t.pnl < 0 ? l + 1 : 0;
    maxW = Math.max(maxW, w);
    maxL = Math.max(maxL, l);
  }
  const wins = trades.filter((t) => t.pnl > 0),
    losses = trades.filter((t) => t.pnl < 0),
    sum = (a) => a.reduce((n, t) => n + t.pnl, 0),
    grossWin = sum(wins),
    grossLoss = -sum(losses),
    total = sum(trades),
    mean = (a, k) =>
      a.length ? a.reduce((n, t) => n + (t[k] || 0), 0) / a.length : null;
  return {
    count: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: trades.length ? wins.length / trades.length : null,
    net: total,
    return: initial ? total / initial : null,
    averageWinner: mean(wins, "pnl"),
    averageLoser: mean(losses, "pnl"),
    profitFactor: grossLoss ? grossWin / grossLoss : null,
    expectancy: trades.length ? total / trades.length : null,
    maxDrawdown: drawdown,
    averageR: mean(
      trades.filter((t) => finite(t.rMultiple)),
      "rMultiple",
    ),
    averageHoldingHours: mean(trades, "holdingHours"),
    costs: trades.reduce((n, t) => n + (t.fees || 0) + (t.slippage || 0), 0),
    maxWins: maxW,
    maxLosses: maxL,
    equity: values,
    drawdowns,
  };
}
export function backtest(
  dataset,
  s,
  { capital = 10000, costs = defaults, start = 0, end = 1 } = {},
) {
  validateDataset(dataset);
  validateStrategy(s);
  number(capital, 100, 1e8);
  if (dataset.kind === "option-quotes")
    throw Error(
      "Actual-quote execution is not implemented; actual quote imports are never silently converted to model results",
    );
  const all = aggregate(dataset.bars, 60),
    from = Math.max(22, Math.floor(all.length * start)),
    to = Math.floor(all.length * end),
    trades = [];
  let cash = capital,
    positions = [],
    pending = false,
    dayBalance = capital,
    lastDay = "";
  const realizedBalance = () => capital + trades.reduce((n, t) => n + t.pnl, 0);
  function finish(p, b, premium, reason) {
    const fill = Math.max(0, premium - costs.slippage),
      proceeds = money(fill * 100 * p.qty - costs.commission * p.qty),
      pnl = money(proceeds - p.cost);
    cash = money(cash + proceeds);
    trades.push({
      ...p,
      exitTime: b.time,
      exit: fill,
      pnl,
      exitReason: reason,
      rMultiple: pnl / p.plannedRisk,
      holdingHours: (b.time - p.entryTime) / 36e5,
      fees: costs.commission * p.qty * 2,
      slippage: costs.slippage * p.qty * 200,
      source:
        dataset.kind === "synthetic"
          ? "synthetic-backtest"
          : "historical-underlying-modeled-options",
    });
    positions = positions.filter((x) => x !== p);
  }
  for (let i = from; i < to; i++) {
    const b = all[i],
      entryTime = b.time - b.count * 900000,
      entryIv = all[i - 1].iv || costs.iv || 0.3;
    if (b.session !== lastDay) {
      lastDay = b.session;
      dayBalance = realizedBalance();
    }
    // A signal from the previous completed close may enter at this bar's open.
    if (
      pending &&
      positions.length < s.maxPositions &&
      realizedBalance() >= dayBalance * (1 - s.dailyLoss / 100)
    ) {
      const type = s.direction === "bullish" ? "call" : "put",
        expiry = entryTime + s.minDte * 86400000;
      const candidates = Array.from({ length: 21 }, (_, j) => {
        const strike = Math.max(0.5, Math.round(b.open) + (j - 10));
        return {
          strike,
          q: modelQuote(
            type,
            b.open,
            strike,
            expiry,
            entryTime,
            entryIv,
            costs,
          ),
        };
      })
        .filter(
          (c) =>
            Math.abs(c.q.delta) >= s.minDelta &&
            Math.abs(c.q.delta) <= s.maxDelta &&
            (c.q.ask - c.q.bid) / Math.max(c.q.mid, 0.01) <= s.maxSpread &&
            entryIv <= s.maxIv,
        )
        .sort(
          (a, b) =>
            Math.abs(Math.abs(a.q.delta) - 0.6) -
            Math.abs(Math.abs(b.q.delta) - 0.6),
        );
      if (candidates.length) {
        const { strike, q } = candidates[0],
          entry = q.ask + costs.slippage,
          stop = entry * (1 - s.stopPercent / 100),
          reserved = positions.reduce(
            (n, p) => n + costs.commission * p.qty,
            0,
          ),
          available = Math.max(0, cash - reserved);
        const sizing = positionSize(
            available,
            s.riskPercent,
            entry,
            stop,
            costs.commission,
          ),
          dailyRemaining = Math.max(
            0,
            (dayBalance * s.dailyLoss) / 100 -
              (dayBalance - realizedBalance()) -
              positions.reduce((n, p) => n + p.plannedRisk, 0),
          );
        const qty = Math.min(
          sizing.quantity,
          costs.liquidity,
          Math.floor(dailyRemaining / sizing.plannedPerContract),
          Math.floor(available / (entry * 100 + costs.commission * 2)),
        );
        if (qty) {
          const cost = money(entry * 100 * qty + costs.commission * qty);
          positions.push({
            type,
            strike,
            expiry,
            entry,
            entryTime,
            entrySpot: b.open,
            index: i,
            qty,
            cost,
            stop,
            target: entry + (entry - stop) * s.targetR,
            plannedRisk: sizing.plannedPerContract * qty,
            maxLoss: cost + costs.commission * qty,
            strategy: s.name,
            timeframe: "1 hour",
            pattern: s.template,
          });
          cash = money(cash - cost);
        }
      }
    }
    // Includes the entry bar: an open fill is exposed to that bar's full range.
    for (const p of [...positions]) {
      const iv = b.iv || costs.iv || 0.3,
        q = modelQuote(p.type, b.close, p.strike, p.expiry, b.time, iv, costs),
        low = modelQuote(
          p.type,
          p.type === "call" ? b.low : b.high,
          p.strike,
          p.expiry,
          b.time,
          iv,
          costs,
        ).bid,
        high = modelQuote(
          p.type,
          p.type === "call" ? b.high : b.low,
          p.strike,
          p.expiry,
          b.time,
          iv,
          costs,
        ).bid,
        open = modelQuote(
          p.type,
          b.open,
          p.strike,
          p.expiry,
          entryTime,
          iv,
          costs,
        ).bid;
      if (b.time >= p.expiry)
        finish(
          p,
          b,
          intrinsic(p.type, b.close, p.strike),
          "Educational expiry cash settlement",
        );
      else if (low <= p.stop)
        finish(
          p,
          b,
          Math.min(p.stop, open),
          "Stop-first OHLC / gap at opening bid",
        );
      else if (high >= p.target) finish(p, b, p.target, "Target");
      else if (
        i - p.index >= s.maxHold ||
        (!s.overnight && b.session !== all[i + 1]?.session)
      )
        finish(p, b, q.bid, "Holding/session limit");
    }
    const daily = aggregate(
        dataset.bars.filter((x) => x.time <= b.time),
        390,
      ).slice(0, -1),
      dailyInd = indicators(daily);
    const dailyOk =
      !s.trend ||
      (daily.length >= 20 &&
        (s.direction === "bullish"
          ? dailyInd.ema9.at(-1) > dailyInd.ema20.at(-1)
          : dailyInd.ema9.at(-1) < dailyInd.ema20.at(-1)));
    pending = b.count === 4 && dailyOk && signal(all.slice(0, i + 1), s);
  }
  for (const p of [...positions]) {
    const b = all[to - 1],
      q = modelQuote(
        p.type,
        b.close,
        p.strike,
        p.expiry,
        b.time,
        b.iv || costs.iv || 0.3,
        costs,
      );
    finish(p, b, q.bid, "Dataset end");
  }
  return {
    dataset: dataset.name,
    kind: dataset.kind,
    strategy: structuredClone(s),
    from,
    to,
    trades,
    metrics: analytics(trades, capital),
    assumptions:
      "Model-priced European options. Completed hourly signals, next-open entries, entry-bar exposure, stop-first OHLC, worse opening gap fills. No historical options quotes. Synthetic results are not market evidence.",
  };
}
export function freshPlatform() {
  return {
    version: 1,
    replay: newReplay(),
    strategies: [],
    datasets: [],
    runs: [],
    hourlyCompleted: [],
    hourlyProgress: {},
    advancedAttempts: [],
    patternViewed: [],
    milestones: {
      lessons: 5,
      accuracy: 0.8,
      attempts: 10,
      replayTrades: 5,
      adherence: 0.8,
    },
    journal: [],
  };
}
function validatePlatformContents(p) {
  const text = (v, max = 10000) => typeof v === "string" && v.length <= max;
  if (!p || !p.replay) throw Error("Missing platform state");
  if (
    p.hourlyCompleted?.some((x) => !/^hour-(0[1-9]|1[0-5])$/.test(x)) ||
    new Set(p.hourlyCompleted).size !== p.hourlyCompleted.length ||
    p.patternViewed?.some((x) => !text(x, 100))
  )
    throw Error("Invalid platform progress");
  for (const [id, x] of Object.entries(p.hourlyProgress || {}))
    if (
      !/^hour-(0[1-9]|1[0-5])$/.test(id) ||
      typeof x.exercise !== "boolean" ||
      typeof x.checks !== "boolean" ||
      (x.answer !== undefined && !finite(x.answer))
    )
      throw Error("Invalid hourly exercise");
  for (const a of p.advancedAttempts || [])
    if (
      !a ||
      !text(a.id, 200) ||
      !text(a.question, 200) ||
      !text(a.category, 100) ||
      !finite(a.answer) ||
      typeof a.correct !== "boolean" ||
      !Number.isFinite(Date.parse(a.at))
    )
      throw Error("Invalid advanced attempt");
  for (const [k, min, max] of [
    ["lessons", 1, 15],
    ["accuracy", 0, 1],
    ["attempts", 1, 1000],
    ["replayTrades", 1, 1000],
    ["adherence", 0, 1],
  ])
    if (!finite(p.milestones?.[k], min, max)) throw Error("Invalid milestone");
  for (const s of p.strategies || [])
    if (
      !text(s.id, 200) ||
      !text(s.watchlist, 1000) ||
      !text(s.patternCriteria) ||
      typeof s.trend !== "boolean" ||
      typeof s.overnight !== "boolean"
    )
      throw Error("Invalid strategy record");
  for (const run of p.runs || []) {
    if (
      !run ||
      !text(run.dataset, 200) ||
      !["synthetic", "underlying-only", "option-quotes"].includes(run.kind) ||
      !Array.isArray(run.trades) ||
      run.trades.length > 10000 ||
      !run.metrics ||
      !text(run.assumptions) ||
      !finite(run.from, 0) ||
      !finite(run.to, 0)
    )
      throw Error("Invalid saved backtest");
    validateStrategy(run.strategy);
    for (const [k, v] of Object.entries(run.metrics)) {
      if (["equity", "drawdowns"].includes(k)) {
        if (!Array.isArray(v) || v.some((x) => !finite(x)))
          throw Error("Invalid saved curve");
      } else if (v !== null && !finite(v)) throw Error("Invalid saved metric");
    }
  }
  for (const t of [...(p.replay.trades || []), ...(p.journal || [])])
    if (
      !t ||
      !finite(t.pnl) ||
      !finite(t.exitTime, 0) ||
      !finite(t.exit, 0) ||
      !text(t.id, 200) ||
      (t.adherence !== null &&
        t.adherence !== undefined &&
        !finite(t.adherence, 0, 1))
    )
      throw Error("Invalid replay journal");
  for (const d of p.replay.drawings || [])
    if (
      !["support", "resistance", "trend"].includes(d.type) ||
      !finite(d.price, 0.01) ||
      !finite(d.price2, 0.01) ||
      !finite(d.time1, 0) ||
      !finite(d.time2, 0)
    )
      throw Error("Invalid chart drawing");
  for (const o of p.replay.orders || [])
    if (
      !text(o.id, 200) ||
      !["call", "put"].includes(o.type) ||
      !["strike", "expiry", "qty", "stop", "target", "limit", "placed"].every(
        (k) => finite(o[k], 0),
      ) ||
      !Number.isInteger(o.qty) ||
      o.qty < 1 ||
      o.qty > 100 ||
      o.stop >= o.limit ||
      o.target <= o.limit
    )
      throw Error("Invalid pending order");
  if (
    !Number.isInteger(p.replay.nextId) ||
    p.replay.nextId < 1 ||
    p.replay.equity?.some((x) => !finite(x.time, 0) || !finite(x.value))
  )
    throw Error("Invalid replay history");
  if (
    p.guidedScenario &&
    (!Number.isInteger(p.guidedScenario.step) ||
      p.guidedScenario.step < 0 ||
      p.guidedScenario.step > 15 ||
      !Array.isArray(p.guidedScenario.answers) ||
      p.guidedScenario.answers.some((x) => !text(x, 5000)) ||
      (p.guidedScenario.assessments &&
        (!Array.isArray(p.guidedScenario.assessments) ||
          p.guidedScenario.assessments.length > 10 ||
          p.guidedScenario.assessments.some(
            (a) => typeof a.correct !== "boolean" || !finite(a.answer, 0, 2),
          ))))
  )
    throw Error("Invalid guided scenario");
}
export function validatePlatform(p) {
  validatePlatformContents(p);
  if (
    !p ||
    p.version !== 1 ||
    ![
      "strategies",
      "datasets",
      "runs",
      "hourlyCompleted",
      "advancedAttempts",
      "patternViewed",
      "journal",
    ].every((k) => Array.isArray(p[k]) && p[k].length <= 10000) ||
    !p.hourlyProgress ||
    !p.milestones
  )
    throw Error("Invalid platform data");
  p.strategies.forEach(validateStrategy);
  p.datasets.forEach(validateDataset);
  const r = p.replay;
  if (
    !r ||
    !Number.isInteger(r.seed) ||
    !regimes.includes(r.regime) ||
    !Number.isInteger(r.cursor) ||
    r.cursor < 1 ||
    r.cursor > 1144 ||
    !["cash", "initial", "realized"].every((k) => finite(r[k])) ||
    r.cash < 0 ||
    !["positions", "orders", "trades", "equity", "drawings"].every(
      (k) => Array.isArray(r[k]) && r[k].length <= 10000,
    )
  )
    throw Error("Invalid replay state");
  for (const [k, min, max] of [
    ["spread", 0, 0.5],
    ["commission", 0, 100],
    ["slippage", 0, 100],
    ["liquidity", 1, 100],
    ["rate", -0.1, 1],
    ["dividend", 0, 1],
    ["iv", 0.01, 5],
    ["dailyLoss", 0.1, 100],
    ["maxPositions", 1, 10],
  ]) {
    if (!finite(r.settings[k], min, max))
      throw Error("Invalid replay setting " + k);
  }
  if (
    !Number.isInteger(r.settings.maxPositions) ||
    !Number.isInteger(r.settings.liquidity)
  )
    throw Error("Whole position and liquidity limits required");
  for (const t of [...r.positions, ...r.trades])
    if (
      !t ||
      !/^replay-[a-zA-Z0-9-]+$/.test(t.id) ||
      !["call", "put"].includes(t.type) ||
      !finite(t.qty, 1, 100) ||
      !Number.isInteger(t.qty) ||
      ![
        "strike",
        "expiry",
        "entry",
        "entryTime",
        "cost",
        "stop",
        "target",
      ].every((k) => finite(t[k], 0))
    )
      throw Error("Invalid replay trade");
  return p;
}
