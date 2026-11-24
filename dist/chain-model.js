import { price, intrinsic, money, normalCDF } from "./pricing.js?v=382f06ff093b";
const valid = (x, min = 0, max = 1e15) =>
  typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
function inputs(c) {
  if (
    !["call", "put"].includes(c.type) ||
    ![c.spot, c.strike].every((x) => valid(x, 0.00001)) ||
    !valid(c.days) ||
    !valid(c.iv, 0, 5) ||
    !valid(c.premium) ||
    !["buy", "sell"].includes(c.side) ||
    !valid(c.rate ?? 0, -0.1, 1) ||
    !valid(c.dividend ?? 0, 0, 1) ||
    !valid(c.fees ?? 0)
  )
    throw Error("Invalid contract model inputs");
}
export function expirationStats(c) {
  inputs(c);
  const fee = c.fees ?? 0,
    net = c.side === "buy" ? c.premium + fee : c.premium - fee,
    breakeven = c.type === "call" ? c.strike + net : c.strike - net;
  const maxProfit =
      c.side === "buy" ? (c.type === "call" ? Infinity : c.strike - net) : net,
    maxLoss =
      c.side === "buy"
        ? net
        : c.type === "call"
          ? Infinity
          : Math.max(0, c.strike - net);
  return { breakeven, maxProfit, maxLoss };
}
// Risk-neutral terminal lognormal distribution; threshold is net expiration break-even.
export function chanceOfProfit(c) {
  inputs(c);
  const { breakeven } = expirationStats(c),
    above = c.type === "call" ? c.side === "buy" : c.side === "sell";
  if (!c.days || !c.iv) {
    const terminal =
      c.spot * Math.exp((((c.rate ?? 0) - (c.dividend ?? 0)) * c.days) / 365);
    return (above ? terminal > breakeven : terminal < breakeven) ? 1 : 0;
  }
  if (breakeven <= 0) return above ? 1 : 0;
  const t = c.days / 365,
    z =
      (Math.log(breakeven / c.spot) -
        ((c.rate ?? 0) - (c.dividend ?? 0) - (c.iv * c.iv) / 2) * t) /
      (c.iv * Math.sqrt(t)),
    below = normalCDF(z);
  return Math.min(1, Math.max(0, above ? 1 - below : below));
}
const hash = (s) => {
  let h = 2166136261;
  for (const c of s) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
};
export function syntheticLiquidity({
  ticker = "DEMO",
  type,
  strike,
  expiry,
  time,
  daily = false,
}) {
  if (
    !Number.isFinite(time) ||
    !Number.isFinite(expiry) ||
    !valid(strike, 0.00001) ||
    !["call", "put"].includes(type)
  )
    throw Error("Invalid liquidity identity");
  const key = [ticker, type, strike, expiry].join(":"),
    session = new Date(time).toISOString().slice(0, 10),
    openInterest = 100 + Math.floor(hash(key + ":OI") * 19900),
    minute = new Date(time).getUTCHours() * 60 + new Date(time).getUTCMinutes(),
    progress = daily ? 1 : Math.max(0, Math.min(1, (minute - 870) / 390)),
    volume = Math.floor(
      openInterest * (0.12 + hash(key + ":" + session) * 0.85) * progress,
    );
  return {
    openInterest,
    volume,
    session,
    synthetic: true,
    spreadFactor: 0.45 + 1.5 * (1 - openInterest / 20000),
  };
}
export function liquidityQuote(q, c, spread = 0.05) {
  const liquidity = syntheticLiquidity(c),
    half =
      c.expiry > c.time
        ? Math.max(0.01, ((q.mid * spread) / 2) * liquidity.spreadFactor)
        : 0;
  return {
    ...q,
    bid: money(Math.max(0, q.mid - half)),
    ask: money(q.mid + half),
    liquidity,
  };
}
export const moneyness = (type, spot, strike) =>
  Math.abs(spot - strike) < 0.01
    ? "ATM"
    : (type === "call" ? spot > strike : spot < strike)
      ? "ITM"
      : "OTM";
export function orderedRows(rows, spot, sort = "desc") {
  const sorted = [...rows].sort((a, b) =>
    sort === "asc" ? a.strike - b.strike : b.strike - a.strike,
  );
  let index = sorted.findIndex((r) =>
    sort === "asc" ? r.strike >= spot : r.strike <= spot,
  );
  if (index < 0) index = sorted.length;
  return {
    rows: sorted,
    divider: index,
    atm: sorted.some((r) => Math.abs(r.strike - spot) < 0.01),
  };
}
export function returnsValue(
  c,
  futureSpot,
  evaluationTime,
  now,
  expiry,
  qty = 1,
) {
  inputs(c);
  if (
    !valid(futureSpot, 0.00001) ||
    !Number.isInteger(qty) ||
    qty < 1 ||
    qty > 100 ||
    !Number.isFinite(evaluationTime) ||
    evaluationTime < now ||
    evaluationTime > expiry
  )
    throw Error(
      "Choose a valid future price, quantity and evaluation time between now and expiry",
    );
  const days = (expiry - evaluationTime) / 86400000,
    value = price(
      c.type,
      futureSpot,
      c.strike,
      days,
      c.iv,
      c.rate ?? 0,
      c.dividend ?? 0,
    ),
    sign = c.side === "buy" ? 1 : -1,
    pnl = (sign * (value - c.premium) - (c.fees ?? 0)) * 100 * qty;
  return {
    value,
    pnl,
    return: c.premium ? pnl / (c.premium * 100 * qty) : null,
    remainingTimeValue: Math.max(
      0,
      value - intrinsic(c.type, futureSpot, c.strike),
    ),
    ...expirationStats(c),
  };
}
export function validDisplay(x) {
  if (
    !x ||
    !["beginner", "advanced"].includes(x.mode) ||
    !["asc", "desc"].includes(x.sort) ||
    !Array.isArray(x.columns) ||
    x.columns.length > 20 ||
    x.columns.some(
      (k) =>
        ![
          "bid",
          "ask",
          "mid",
          "spread",
          "iv",
          "delta",
          "gamma",
          "theta",
          "vega",
          "intrinsic",
          "extrinsic",
          "breakeven",
        ].includes(k),
    )
  )
    throw Error("Invalid chain display preferences");
  return x;
}
export function validateChainState(s) {
  if (s.settings?.chainDisplay) validDisplay(s.settings.chainDisplay);
  if (s.settings?.contractContext) {
    const c = s.settings.contractContext;
    if (
      !c ||
      !["call", "put"].includes(c.type) ||
      !["buy", "sell"].includes(c.side) ||
      !["spot", "strike", "time", "expiry", "premium"].every((k) =>
        valid(c[k]),
      ) ||
      typeof c.ticker !== "string"
    )
      throw Error("Invalid saved contract context");
  }
  if (s.chainOrders) {
    if (!Array.isArray(s.chainOrders) || s.chainOrders.length > 1000)
      throw Error("Invalid conditional orders");
    for (const o of s.chainOrders)
      if (
        !o ||
        typeof o.id !== "string" ||
        !["sim", "scenario"].includes(o.mode) ||
        !["call", "put"].includes(o.type) ||
        !Number.isInteger(o.qty) ||
        o.qty < 1 ||
        o.qty > 100 ||
        !valid(o.strike, 0.01) ||
        !valid(o.limit, 0.01) ||
        !Number.isFinite(Date.parse(o.expiration)) ||
        !Number.isInteger(o.placedDay)
      )
        throw Error("Invalid conditional order");
  }
  return s;
}
