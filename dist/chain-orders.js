import { money } from "./pricing.js";
import { preview, execute, closeLongQuantity } from "./execution.js";
import { enter, exit, queueOrder, equity } from "./platform-engine.js";
const date = (expiry) => new Date(expiry).toISOString().slice(0, 10);
export function practiceLots(s, c) {
  return s.accounts[s.mode].positions
    .filter(
      (p) =>
        p.ticker === c.ticker &&
        p.expiration === date(c.expiry) &&
        p.legs.length === 1 &&
        p.legs[0].side === 1 &&
        p.legs[0].type === c.type &&
        p.legs[0].strike === c.strike &&
        p.strategy.startsWith("Long"),
    )
    .map((p) => ({
      id: p.id,
      qty: p.qty,
      entryPremium: p.debit / p.qty / 100,
    }));
}
export function checkPracticeOrder(s, o, get) {
  const c = o.contract,
    a = s.accounts[s.mode];
  if (!["Market", "Limit"].includes(o.kind))
    throw Error("Unsupported order type");
  if (o.kind === "Limit" && (!Number.isFinite(o.limit) || o.limit <= 0))
    throw Error("Use a positive limit premium");
  if (!Number.isInteger(o.qty) || o.qty < 1 || o.qty > 100)
    throw Error("Use 1–100 whole contracts");
  get(c.type, c.strike, { ticker: c.ticker, expiration: date(c.expiry) }, true);
  if (o.side === "sell") {
    const lot = practiceLots(s, c).find((p) => p.id === o.lot);
    if (!lot || o.qty > lot.qty || o.kind !== "Market")
      throw Error("Only a market close of an owned long lot is supported");
    return;
  }
  if (o.side !== "buy") throw Error("Unsupported side");
  if (o.kind === "Limit" && s.mode === "snapshot")
    throw Error("Snapshot limit orders are unsupported");
  const q =
    o.kind === "Limit"
      ? () => ({ bid: o.limit, ask: o.limit })
      : (type, k) =>
          get(type, k, { ticker: c.ticker, expiration: date(c.expiry) }, true);
  return preview(
    a,
    c.type === "call" ? "Long call" : "Long put",
    o.qty,
    c.ticker,
    date(c.expiry),
    c.strike,
    c.strike + 5,
    q,
  );
}
export function submitPracticeOrder(s, o, get) {
  const c = o.contract;
  const checked = checkPracticeOrder(s, o, get);
  if (o.side === "sell") {
    const pnl = closeLongQuantity(
      s.accounts[s.mode],
      o.lot,
      o.qty,
      (type, k, p) => get(type, k, p, true),
    );
    const j = s.journal.find((j) => j.tradeId === o.lot);
    if (j) {
      j.details ??= {};
      j.details.closes ??= [];
      const record = {
        quantity: o.qty,
        pnl,
        reason: o.reason || "",
        simulationDay: s.market.day,
        time: new Date().toISOString(),
      };
      j.details.closes.push(record);
      j.details.lastClose = record;
      j.details.realizedPnl = money((j.details.realizedPnl || 0) + pnl);
      j.details.remainingQuantity =
        s.accounts[s.mode].positions.find((p) => p.id === o.lot)?.qty || 0;
    }
    return { pnl };
  }
  if (o.kind === "Limit") {
    s.chainOrders ??= [];
    s.chainOrders.push({
      id: crypto.randomUUID(),
      mode: s.mode,
      type: c.type,
      ticker: c.ticker,
      strike: c.strike,
      expiration: date(c.expiry),
      qty: o.qty,
      limit: o.limit,
      placedDay: s.market.day,
      status: "pending",
      reason: o.reason,
    });
    return { pending: true };
  }
  const id = crypto.randomUUID();
  execute(s.accounts[s.mode], checked, id);
  s.journal.unshift({
    id: crypto.randomUUID(),
    tradeId: id,
    mode: s.mode,
    reason: o.reason || "",
    movement: "",
    holding: "",
    exit: "",
    risk: "",
    reflection: "",
    created: new Date().toISOString(),
    details: {
      source: "broker-chain",
      ticker: c.ticker,
      type: c.type,
      strike: c.strike,
      expiration: date(c.expiry),
      quantity: o.qty,
      remainingQuantity: o.qty,
      entryPremium: checked.debit / o.qty / 100,
      simulationDay: s.market.day,
      greeks: get(c.type, c.strike, {
        ticker: c.ticker,
        expiration: date(c.expiry),
      }),
      maximumLoss: checked.debit,
    },
  });
  return { id };
}
export function processPracticeLimits(s, get) {
  for (const o of s.chainOrders || []) {
    if (
      o.mode !== s.mode ||
      o.status !== "pending" ||
      s.market.day <= o.placedDay
    )
      continue;
    const time =
      Date.parse(s.market.base + "T12:00:00Z") + s.market.day * 86400000;
    if (time >= Date.parse(o.expiration + "T12:00:00Z")) {
      o.status = "expired";
      continue;
    }
    try {
      const q = get(
        o.type,
        o.strike,
        { ticker: o.ticker, expiration: o.expiration },
        true,
      );
      if (q.ask > o.limit) continue;
      submitPracticeOrder(
        s,
        {
          contract: { ...o, expiry: Date.parse(o.expiration + "T12:00:00Z") },
          side: "buy",
          kind: "Market",
          qty: o.qty,
          reason: o.reason,
        },
        get,
      );
      o.status = "filled";
      o.fill = q.ask;
      o.filledDay = s.market.day;
    } catch (e) {
      o.status = "rejected";
      o.message = e.message;
    }
  }
}
export function replayLots(r, c) {
  return r.positions
    .filter(
      (p) =>
        p.type === c.type && p.strike === c.strike && p.expiry === c.expiry,
    )
    .map((p) => ({ id: p.id, qty: p.qty, entryPremium: p.cost / p.qty / 100 }));
}
export function closeReplayQuantity(r, id, qty) {
  const p = r.positions.find((p) => p.id === id);
  if (!p || !Number.isInteger(qty) || qty < 1 || qty > p.qty)
    throw Error("Quantity exceeds owned replay lot");
  if (qty === p.qty) return exit(r, id, "Chain sell to close");
  const draft = structuredClone(r),
    held = draft.positions.find((p) => p.id === id),
    ratio = qty / held.qty,
    part = { ...held, id: held.id + "-part-" + draft.nextId++, qty };
  for (const k of ["cost", "plannedRisk", "maxLoss", "mfe", "mae"]) {
    part[k] = money((held[k] || 0) * ratio);
    held[k] = money((held[k] || 0) - part[k]);
  }
  held.qty -= qty;
  draft.positions.push(part);
  const result = exit(draft, part.id, "Chain partial sell to close");
  result.positionId = id;
  Object.assign(r, draft);
  return result;
}
function replayOrder(o) {
  return {
    type: o.contract.type,
    strike: o.contract.strike,
    expiry: o.contract.expiry,
    qty: o.qty,
    limit: o.limit,
    stop: o.stop,
    target: o.target,
    riskPercent: o.riskPercent,
    reason: o.reason,
    strategy: "Chain discretionary",
    pattern: "Unclassified",
  };
}
export function checkReplayOrder(r, o) {
  if (!["Market", "Limit"].includes(o.kind))
    throw Error("Unsupported order type");
  if (!Number.isInteger(o.qty) || o.qty < 1 || o.qty > 100)
    throw Error("Use 1�100 whole contracts");
  const draft = structuredClone(r);
  if (o.side === "sell") {
    if (o.kind !== "Market")
      throw Error("Owned-long closes use a market order");
    if (!replayLots(r, o.contract).some((l) => l.id === o.lot))
      throw Error("Owned lot does not match this contract");
    return closeReplayQuantity(draft, o.lot, o.qty);
  }
  if (o.side !== "buy") throw Error("Short opening unsupported");
  const order = replayOrder(o);
  if (o.kind === "Market") return enter(draft, order);
  const cost = o.limit * o.qty * 100 + r.settings.commission * o.qty * 2;
  if (!Number.isFinite(cost) || cost > r.cash)
    throw Error("Insufficient replay buying power for the limit");
  if (
    (o.limit - o.stop) * o.qty * 100 + r.settings.commission * o.qty * 2 >
    (equity(r) * o.riskPercent) / 100
  )
    throw Error("Limit planned risk exceeds budget");
  return queueOrder(draft, order);
}
export function submitReplayOrder(r, o) {
  checkReplayOrder(r, o);
  if (o.side === "sell") return closeReplayQuantity(r, o.lot, o.qty);
  if (o.kind === "Limit") return queueOrder(r, replayOrder(o));
  return enter(r, replayOrder(o));
}
