export const money = (n) => {
  if (!Number.isFinite(n) || Math.abs(n) > 1e12)
    throw Error("Invalid monetary value");
  return Math.round((n + Number.EPSILON) * 100) / 100;
};
export const intrinsic = (type, s, k) =>
  Math.max(0, type === "call" ? s - k : k - s);
const cdf = (x) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(x)),
    d = 0.3989422804 * Math.exp((-x * x) / 2),
    p =
      1 -
      d *
        t *
        (0.31938153 +
          t *
            (-0.356563782 +
              t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? p : 1 - p;
};
export function price(type, s, k, days, iv, r = 0, q = 0) {
  if (
    !["call", "put"].includes(type) ||
    ![s, k, days, iv, r, q].every(Number.isFinite) ||
    s <= 0 ||
    k <= 0 ||
    days < 0 ||
    iv < 0 ||
    iv > 5 ||
    r < -0.1 ||
    r > 1 ||
    q < 0 ||
    q > 1
  )
    throw Error("Invalid pricing inputs");
  if (!days) return intrinsic(type, s, k);
  const t = days / 365,
    sd = s * Math.exp(-q * t),
    kd = k * Math.exp(-r * t);
  if (!iv) return Math.max(0, type === "call" ? sd - kd : kd - sd);
  const v = iv * Math.sqrt(t),
    d1 = (Math.log(s / k) + (r - q + (iv * iv) / 2) * t) / v,
    d2 = d1 - v;
  return Math.max(
    0,
    type === "call"
      ? sd * cdf(d1) - kd * cdf(d2)
      : kd * cdf(-d2) - sd * cdf(-d1),
  );
}
export function quote(type, s, k, days, iv) {
  const mid = money(price(type, s, k, days, iv)),
    half = days ? Math.max(0.01, mid * 0.025) : 0;
  const p = (ss, dd, vv) =>
    price(type, ss, k, Math.max(0, dd), Math.max(0, vv));
  return {
    bid: money(Math.max(0, mid - half)),
    ask: money(mid + half),
    mid,
    delta: (p(s + 0.01, days, iv) - p(s - 0.01, days, iv)) / 0.02,
    gamma:
      (p(s + 0.01, days, iv) -
        2 * price(type, s, k, days, iv) +
        p(s - 0.01, days, iv)) /
      0.0001,
    theta: p(s, days - 1, iv) - price(type, s, k, days, iv),
    vega: p(s, days, iv + 0.01) - price(type, s, k, days, iv),
  };
}
export const strategies = {
  "Long call": [["call", 1, 0]],
  "Long put": [["put", 1, 0]],
  "Covered call": [["call", -1, 0]],
  "Cash-secured put": [["put", -1, 0]],
  "Bull call debit spread": [
    ["call", 1, 0],
    ["call", -1, 1],
  ],
  "Bear put debit spread": [
    ["put", 1, 1],
    ["put", -1, 0],
  ],
  "Bull put credit spread": [
    ["put", 1, 0],
    ["put", -1, 1],
  ],
  "Bear call credit spread": [
    ["call", -1, 0],
    ["call", 1, 1],
  ],
};
export function validateQuote(q, now = Date.now()) {
  if (
    !q ||
    !["call", "put"].includes(q.type) ||
    !/^\w[\w.-]{0,9}$/.test(q.ticker) ||
    ![q.underlying, q.strike, q.bid, q.ask].every(Number.isFinite) ||
    q.underlying <= 0 ||
    q.strike <= 0 ||
    q.bid < 0 ||
    q.ask < q.bid ||
    !Number.isFinite(Date.parse(q.expiration)) ||
    !Number.isFinite(Date.parse(q.timestamp))
  )
    throw Error("Invalid quote: check symbol, prices, dates and bid ≤ ask");
  if (Date.parse(q.expiration + "T23:59:59Z") <= now)
    throw Error("Quote has expired");
  if (Date.parse(q.timestamp) > now + 60000)
    throw Error("Quote timestamp is in the future");
  if (now - Date.parse(q.timestamp) > 15 * 60000)
    throw Error("Stale quote: update it before trading (15 minute limit)");
  return q;
}
export function payoff(p, s) {
  return money(
    p.legs.reduce(
      (v, l) => v + l.side * intrinsic(l.type, s, l.strike) * 100 * p.qty,
      0,
    ) - p.debit,
  );
}
export function risk(p, shareBasis = 0) {
  const ks = p.legs.map((l) => l.strike),
    lo = Math.min(...ks),
    hi = Math.max(...ks),
    vals = [0, ...ks, Math.max(hi * 2, hi + 100)].map(
      (s) =>
        payoff(p, s) +
        (p.strategy === "Covered call" ? (s - shareBasis) * 100 * p.qty : 0),
    );
  return {
    profit: p.strategy === "Long call" ? Infinity : Math.max(...vals),
    loss: -Math.min(...vals),
    breakeven:
      p.strategy === "Covered call"
        ? shareBasis + p.debit / (100 * p.qty)
        : p.legs[0].type === "call"
          ? lo + Math.abs(p.debit) / (100 * p.qty)
          : hi - Math.abs(p.debit) / (100 * p.qty),
  };
}

export const normalCDF = cdf;
