import {
  chanceOfProfit,
  expirationStats,
  returnsValue,
  orderedRows,
  moneyness,
  validDisplay,
} from "./chain-model.js?v=382f06ff093b";
import { modelQuote, defaults } from "./platform-engine.js?v=382f06ff093b";
import { esc } from "./platform-charts.js?v=382f06ff093b";
const sessions = new Map(),
  usd = (n) =>
    Number.isFinite(n)
      ? n.toLocaleString("en-US", { style: "currency", currency: "USD" })
      : "Unlimited",
  pct = (n) =>
    Number.isFinite(n) ? (n * 100).toFixed(1) + "%" : "Unavailable";
const tips = {
  volume:
    "Synthetic contracts traded during the modeled session; resets by simulation date. Not real exchange activity.",
  oi: "Synthetic open interest: modeled outstanding contracts, distinct from daily volume. Not real clearing data.",
  cop: "Risk-neutral lognormal estimate using expiration break-even after fees, not delta, a success guarantee, or a probability of profit before expiration. Sell rows illustrate hypothetical shorts; selling to close has different P/L.",
  delta:
    "Local option-value sensitivity to a $1 stock move. Delta changes with stock price, time and IV; it is not chance of profit.",
  gamma: "Change in delta per $1 stock move.",
  theta:
    "Theoretical per-share value change over one calendar day. Shorter-dated options can decay faster.",
  vega: "Theoretical per-share change for a +1 percentage point IV change.",
  iv: "Assumed annual implied volatility in the model; not a forecast or a measured live quote.",
  spread:
    "Ask minus bid. Buy at ask, sell at bid; the spread is a trading cost.",
  mid: "Midpoint/model mark is a valuation, not a guaranteed executable price.",
  intrinsic: "Call: max(stock − strike,0); put: max(strike − stock,0).",
  extrinsic:
    "Theoretical value less intrinsic value; affected by time and volatility.",
  breakeven:
    "Stock threshold for zero expiration P/L after the stated premium and fees. It is not a pre-expiration exit price.",
};
const explain = (k) =>
  `<span class="chain-help" tabindex="0" title="${esc(tips[k] || "Per-share modeled value; multiply by 100 and contract quantity.")}" aria-label="${esc(tips[k] || k)}">ⓘ</span>`;
const labels = {
  bid: "Bid",
  ask: "Ask",
  mid: "Mark",
  spread: "Spread",
  iv: "IV",
  delta: "Delta",
  gamma: "Gamma",
  theta: "Theta/day",
  vega: "Vega/1%",
  intrinsic: "Intrinsic",
  extrinsic: "Extrinsic",
  breakeven: "Break-even",
};
const key = (c) => [c.ticker, c.type, c.strike, c.expiry].join("|");
export function payoffGraph(c, now, expiry, evaluation, qty, futureSpot) {
  const stats = expirationStats(c),
    lo = Math.max(
      0.01,
      Math.min(
        c.spot * 0.7,
        c.strike * 0.7,
        futureSpot * 0.9,
        stats.breakeven > 0 ? stats.breakeven * 0.9 : Infinity,
      ),
    ),
    hi = Math.max(
      c.spot * 1.3,
      c.strike * 1.3,
      futureSpot * 1.1,
      stats.breakeven * 1.1,
    ),
    xs = Array.from({ length: 101 }, (_, i) => lo + ((hi - lo) * i) / 100),
    vals = xs.map((x) => returnsValue(c, x, evaluation, now, expiry, qty).pnl),
    min = Math.min(0, ...vals),
    max = Math.max(0, ...vals),
    range = Math.max(1, max - min),
    x = (n) => 55 + ((n - lo) / (hi - lo)) * 620,
    y = (n) => 265 - ((n - min) / range) * 225,
    zero = y(0),
    selected = returnsValue(c, futureSpot, evaluation, now, expiry, qty).pnl;
  return `<svg class="chain-payoff" data-lo="${lo}" data-hi="${hi}" viewBox="0 0 760 330" role="img" aria-label="${evaluation === expiry ? "Expiration payoff" : "Theoretical pre-expiration P/L"}; stock price horizontal, P/L dollars vertical"><rect x="55" y="40" width="620" height="${zero - 40}" fill="#b3ef7c" opacity=".07"/><rect x="55" y="${zero}" width="620" height="${265 - zero}" fill="#ff9a9a" opacity=".07"/><line x1="55" x2="675" y1="${zero}" y2="${zero}" stroke="#a1b0a7" stroke-dasharray="4 3"/><polyline points="${xs.map((v, i) => x(v) + "," + y(vals[i])).join(" ")}" fill="none" stroke="#b3ef7c" stroke-width="2.5"/>${[
    [c.spot, "Current", "#a1b0a7"],
    [stats.breakeven, "Expiry B/E", "#e4c48a"],
    [futureSpot, "Future input", "#88bdf7"],
  ]
    .filter(([v]) => v >= lo && v <= hi)
    .map(
      ([v, label, color]) =>
        `<line x1="${x(v)}" x2="${x(v)}" y1="40" y2="265" stroke="${color}" stroke-dasharray="3 4"/><text x="${Math.min(590, Math.max(55, x(v) - 25))}" y="${label === "Current" ? 25 : label === "Expiry B/E" ? 295 : 315}" fill="${color}">${label} ${v.toFixed(2)}</text>`,
    )
    .join(
      "",
    )}<circle cx="${x(futureSpot)}" cy="${y(selected)}" r="5" fill="#88bdf7"/><text x="5" y="40">${max.toFixed(0)}</text><text x="5" y="265">${min.toFixed(0)}</text><text x="55" y="285">${lo.toFixed(2)}</text><text x="635" y="285">${hi.toFixed(2)}</text><text x="8" y="18">P/L · USD</text><text x="530" y="325">Underlying · USD</text></svg>`;
}
export function mountChain(root, ctx) {
  let u = sessions.get(ctx.scope);
  if (!u) {
    u = {
      side: "buy",
      type: "call",
      tab: "chain",
      open: new Set(),
      ticker: ctx.tickers()[0],
      expiry: null,
      selected: null,
    };
    sessions.set(ctx.scope, u);
  }
  const saved = ctx.state.settings.chainDisplay || {
    mode: "beginner",
    sort: "desc",
    columns: [
      "bid",
      "ask",
      "mid",
      "spread",
      "iv",
      "delta",
      "gamma",
      "theta",
      "vega",
    ],
  };
  let display = structuredClone(validDisplay(saved));
  const $ = (s) => root.querySelector(s),
    $$ = (s) => Array.from(root.querySelectorAll(s)),
    setDisplay = () => {
      ctx.state.settings.chainDisplay = structuredClone(display);
      ctx.persist(false);
    },
    expirations = () =>
      [
        ...new Set(
          ctx
            .expirations(u.ticker)
            .concat(
              Number.isFinite(u.expiry) && u.expiry > clock() ? [u.expiry] : [],
            ),
        ),
      ].sort((a, b) => a - b),
    clock = () => ctx.time(),
    spot = () => ctx.spot(u.ticker);
  if (!ctx.tickers().includes(u.ticker)) u.ticker = ctx.tickers()[0];
  if (!expirations().includes(u.expiry))
    u.expiry =
      expirations().find((e) => (e - clock()) / 86400000 >= 21) ||
      expirations()[0];
  const contract = (strike, type = u.type, expiry = u.expiry) => {
    const q = ctx.quote(u.ticker, type, strike, expiry);
    return {
      ...q,
      ticker: u.ticker,
      type,
      strike,
      expiry,
      spot: spot(),
      time: clock(),
      days: Math.max(0, (expiry - clock()) / 86400000),
      iv: q.iv ?? ctx.iv(),
      rate: ctx.rate ?? 0,
      dividend: ctx.dividend ?? 0,
      synthetic: ctx.synthetic,
      slippage: ctx.slippage ?? 0,
      fee: ctx.fee ?? 0,
    };
  };
  function assumptions(c, premium) {
    return {
      type: c.type,
      side: u.side,
      spot: c.spot,
      strike: c.strike,
      days: c.days,
      iv: c.iv,
      premium:
        premium ??
        (u.side === "buy"
          ? c.ask + c.slippage
          : Math.max(0, c.bid - c.slippage)),
      fees: (c.fee * 2) / 100,
      rate: c.rate,
      dividend: c.dividend,
    };
  }
  function cop(c) {
    try {
      return chanceOfProfit(assumptions(c));
    } catch {
      return null;
    }
  }
  function valMetric(c, k) {
    const a = assumptions(c),
      st = Number.isFinite(c.iv) ? expirationStats(a) : null;
    const v =
      k === "spread"
        ? c.ask - c.bid
        : k === "intrinsic"
          ? Math.max(
              0,
              c.type === "call" ? c.spot - c.strike : c.strike - c.spot,
            )
          : k === "extrinsic"
            ? Math.max(
                0,
                c.mid -
                  Math.max(
                    0,
                    c.type === "call" ? c.spot - c.strike : c.strike - c.spot,
                  ),
              )
            : k === "breakeven"
              ? st?.breakeven
              : c[k];
    return v === null || !Number.isFinite(v)
      ? "Unavailable"
      : ["delta", "gamma", "theta", "vega"].includes(k)
        ? v.toFixed(3)
        : k === "iv"
          ? pct(v)
          : usd(v);
  }
  function selected() {
    if (
      u.selected &&
      u.selected.type === u.type &&
      u.selected.expiry === u.expiry
    ) {
      try {
        return contract(u.selected.strike);
      } catch {}
    }
    const rows = ctx.strikes(u.ticker, u.expiry);
    if (!rows.length) return null;
    return contract(
      [...rows].sort((a, b) => Math.abs(a - spot()) - Math.abs(b - spot()))[0],
    );
  }
  function details(c) {
    let stats;
    try {
      stats = expirationStats(assumptions(c));
    } catch {}
    return `<div class="chain-details"><div class="chain-metrics">${[
      ["Bid", usd(c.bid), "bid"],
      ["Ask", usd(c.ask), "ask"],
      ...Object.entries(labels)
        .filter(([k]) => !["bid", "ask"].includes(k))
        .map(([k, label]) => [label, valMetric(c, k), k]),
      [
        "Volume",
        c.liquidity?.volume?.toLocaleString() ?? "Unavailable",
        "volume",
      ],
      [
        "Open interest",
        c.liquidity?.openInterest?.toLocaleString() ?? "Unavailable",
        "oi",
      ],
      [
        "Maximum terminal profit",
        stats ? usd(stats.maxProfit * 100) : "Unavailable",
        "max",
      ],
      [
        "Maximum terminal loss",
        stats ? usd(stats.maxLoss * 100) : "Unavailable",
        "max",
      ],
      ["Multiplier", "100 shares", "multiplier"],
      ["Expiration", new Date(c.expiry).toISOString().slice(0, 10), "expiry"],
      ["Moneyness", moneyness(c.type, c.spot, c.strike), "intrinsic"],
    ]
      .map(
        ([name, v, k]) =>
          `<div><span>${name} ${explain(k)}</span><strong>${v}</strong></div>`,
      )
      .join(
        "",
      )}</div><p>Risk figures: one hypothetical ${u.side === "buy" ? "long" : "short"} contract held to expiration, stated round-trip fees included. ${u.side === "sell" ? "Uncovered short opening is disabled; selling to close is a separate, owned-position transaction." : ""}</p><button data-analyze="${c.strike}">Analyze simulated returns</button></div>`;
  }
  function remember(c) {
    ctx.state.settings.contractContext = {
      ticker: c.ticker,
      type: c.type,
      side: u.side,
      strike: c.strike,
      expiry: c.expiry,
      time: c.time,
      spot: c.spot,
      iv: c.iv ?? 0.3,
      rate: c.rate,
      dividend: c.dividend,
      premium: assumptions(c).premium,
      id: key(c) + ":" + c.time,
      source: ctx.scope,
    };
    ctx.persist(false);
  }
  function render() {
    ctx.onContext?.(u.ticker, u.expiry);
    const c = selected(),
      exp = expirations();
    root.innerHTML = `<div class="broker-chain"><div class="chain-heading"><div><h2>Options chain</h2><strong>${esc(u.ticker || "No quotes")} <span>${usd(spot())}</span></strong></div><label>Underlying<select id="bcTicker">${ctx
      .tickers()
      .map(
        (t) => `<option ${t === u.ticker ? "selected" : ""}>${esc(t)}</option>`,
      )
      .join(
        "",
      )}</select></label><label>Expiration<select id="bcExpiry">${exp.map((e) => `<option value="${e}" ${e === u.expiry ? "selected" : ""}>${new Date(e).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" })} (${Math.max(0, (e - clock()) / 86400000).toFixed(Number.isInteger((e - clock()) / 86400000) ? 0 : 2)}D)</option>`).join("")}</select></label></div><div class="chain-tabs" role="tablist" aria-label="Contract workspace"><button role="tab" data-tab="chain" aria-selected="${u.tab === "chain"}">Chain</button><button role="tab" data-tab="returns" aria-selected="${u.tab === "returns"}">Simulated Returns</button></div><div class="chain-toolbar"><div class="chain-segment" role="group" aria-label="Transaction side">${["buy", "sell"].map((s) => `<button data-side="${s}" aria-pressed="${u.side === s}">${s === "buy" ? "Buy" : "Sell"}</button>`).join("")}</div><div class="chain-segment" role="group" aria-label="Option type">${["call", "put"].map((t) => `<button data-type="${t}" aria-pressed="${u.type === t}">${t === "call" ? "Call" : "Put"}</button>`).join("")}</div><label>Strike sort<select id="bcSort"><option value="desc" ${display.sort === "desc" ? "selected" : ""}>High to low</option><option value="asc" ${display.sort === "asc" ? "selected" : ""}>Low to high</option></select></label><label>Display<select id="bcMode"><option value="beginner" ${display.mode === "beginner" ? "selected" : ""}>Beginner</option><option value="advanced" ${display.mode === "advanced" ? "selected" : ""}>Advanced</option></select></label></div><p class="chain-source">${esc(ctx.label)} · ${new Date(clock()).toISOString()} · ${ctx.synthetic ? "Volume and open interest are synthetic, not exchange data." : "Manual quote liquidity / IV / Greeks unavailable unless supplied."}</p>${u.side === "sell" ? '<p class="chain-notice">Sell closes an owned long lot only. No naked short opening. Row COP illustrates a hypothetical short held to expiration, not your selling-to-close profit.</p>' : ""}<details class="chain-settings"><summary>Columns, educational filter and help</summary><div class="chain-columns">${Object.keys(
      labels,
    )
      .map(
        (k) =>
          `<label><input type="checkbox" data-column="${k}" ${display.columns.includes(k) ? "checked" : ""}>${labels[k]}</label>`,
      )
      .join(
        "",
      )}</div><p>Custom columns appear in Advanced mode. Preferences are saved on this browser.</p><label><input id="bcFilter" type="checkbox" ${u.filter ? "checked" : ""}>Apply hourly swing-study criteria</label><div class="chain-filter">${[
      ["minDte", "Minimum DTE", u.minDte ?? 14],
      ["maxDte", "Maximum DTE", u.maxDte ?? 30],
      ["minDelta", "Minimum |delta|", u.minDelta ?? 0.5],
      ["maxDelta", "Maximum |delta|", u.maxDelta ?? 0.7],
      ["maxSpread", "Maximum spread / mark", u.maxSpread ?? 0.12],
    ]
      .map(
        ([id, label, v]) =>
          `<label>${label}<input id="bc-${id}" type="number" step="any" value="${v}"></label>`,
      )
      .join(
        "",
      )}</div><p>Experimental study criteria, not optimal settings or a recommendation. Never choose solely by highest COP or lowest premium.</p><ul><li>Deeper ITM and longer-dated contracts often cost more; compare strikes and expirations, not just price.</li><li>Delta is local sensitivity, not COP. Theta and IV changes can create losses despite correct direction.</li><li>Spreads reduce executable returns. Our COP is a risk-neutral model, not Robinhood's proprietary methodology.</li></ul></details><div class="chain-layout"><div id="bcContent"></div><div id="bcTicket"></div></div></div>`;
    $("#bcTicker").onchange = () => {
      u.ticker = $("#bcTicker").value;
      u.expiry = expirations()[0];
      u.selected = null;
      u.order = null;
      render();
    };
    $("#bcExpiry").onchange = () => {
      u.expiry = Number($("#bcExpiry").value);
      u.selected = null;
      u.order = null;
      render();
    };
    $("#bcSort").onchange = () => {
      display.sort = $("#bcSort").value;
      setDisplay();
      render();
    };
    $("#bcMode").onchange = () => {
      display.mode = $("#bcMode").value;
      setDisplay();
      render();
    };
    $$("[data-tab]").forEach(
      (e) =>
        (e.onclick = () => {
          u.tab = e.dataset.tab;
          render();
        }),
    );
    $$("[data-side]").forEach(
      (e) =>
        (e.onclick = () => {
          u.side = e.dataset.side;
          u.order = null;
          render();
        }),
    );
    $$("[data-type]").forEach(
      (e) =>
        (e.onclick = () => {
          u.type = e.dataset.type;
          u.selected = null;
          u.order = null;
          render();
        }),
    );
    $$("[data-column]").forEach(
      (e) =>
        (e.onchange = () => {
          display.columns = $$("[data-column]:checked").map(
            (e) => e.dataset.column,
          );
          setDisplay();
          if (display.mode === "advanced") render();
        }),
    );
    $("#bcFilter").onchange = () => {
      u.filter = $("#bcFilter").checked;
      render();
    };
    for (const k of ["minDte", "maxDte", "minDelta", "maxDelta", "maxSpread"])
      $("#bc-" + k).onchange = () => {
        const n = Number($("#bc-" + k).value);
        if (!Number.isFinite(n) || n < 0) {
          ctx.toast("Use nonnegative filter values");
          return;
        }
        u[k] = n;
        render();
      };
    if (!c) {
      $("#bcContent").innerHTML =
        '<p class="empty">No contracts for this symbol and expiration.</p>';
      return;
    }
    if (u.tab === "returns") renderReturns(c);
    else renderTable(true);
    if (u.order) ticket(contract(u.order.strike));
  }
  function renderTable(center = false) {
    const oldScroll = $(".broker-table")?.scrollTop || 0;
    let rows = ctx
      .strikes(u.ticker, u.expiry)
      .map((k) => {
        try {
          return contract(k);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    if (u.filter)
      rows = rows.filter(
        (c) =>
          c.days >= (u.minDte ?? 14) &&
          c.days <= (u.maxDte ?? 30) &&
          Math.abs(c.delta) >= (u.minDelta ?? 0.5) &&
          Math.abs(c.delta) <= (u.maxDelta ?? 0.7) &&
          (c.ask - c.bid) / Math.max(c.mid, 0.01) <= (u.maxSpread ?? 0.12),
      );
    const sorted = orderedRows(rows, spot(), display.sort),
      extra =
        display.mode === "advanced"
          ? display.columns.filter((k) => k !== "delta")
          : [];
    let html = "";
    for (let i = 0; i <= sorted.rows.length; i++) {
      if (i === sorted.divider)
        html += `<tr class="stock-divider" data-price-divider><td colspan="${6 + extra.length}">Underlying ${usd(spot())}${sorted.atm ? " · ATM strike available" : ""}</td></tr>`;
      const c = sorted.rows[i];
      if (!c) continue;
      const owned = ctx.positions(c),
        disabled = u.side === "sell" && !owned.length,
        expanded = u.open.has(key(c));
      html += `<tr class="contract-row ${moneyness(c.type, c.spot, c.strike).toLowerCase()} ${u.selected?.strike === c.strike ? "selected" : ""}"><th scope="row"><button class="contract-expand" data-expand="${c.strike}" aria-expanded="${expanded}" aria-controls="bc-detail-${c.strike.toString().replace(".", "-")}"><span aria-hidden="true">${expanded ? "▾" : "▸"}</span> ${usd(c.strike)} <small>${moneyness(c.type, c.spot, c.strike)}</small></button></th><td>${c.liquidity?.volume?.toLocaleString() ?? "—"}</td><td>${c.liquidity?.openInterest?.toLocaleString() ?? "—"}</td><td>${pct(cop(c))}</td><td>${Number.isFinite(c.delta) ? c.delta.toFixed(3) : "—"}</td>${extra.map((k) => `<td>${valMetric(c, k)}</td>`).join("")}<td><button class="contract-price" data-price="${c.strike}" ${disabled ? "disabled" : ""} title="${disabled ? "No eligible owned long position to close" : "Select contract"}" aria-label="${u.side === "buy" ? "Buy" : "Sell to close"} ${c.type} ${c.strike} at ${u.side === "buy" ? "ask" : "bid"} ${usd(u.side === "buy" ? c.ask : c.bid)}">${usd(u.side === "buy" ? c.ask : c.bid)}</button></td></tr>${expanded ? `<tr id="bc-detail-${c.strike.toString().replace(".", "-")}" class="contract-detail"><td colspan="${6 + extra.length}">${details(c)}</td></tr>` : ""}`;
    }
    $("#bcContent").innerHTML =
      `<div class="broker-table" tabindex="0" aria-label="Options chain, scroll for more strikes"><table><thead><tr><th>Strike</th><th>Volume ${explain("volume")}</th><th>Open interest ${explain("oi")}</th><th>Est. COP ${explain("cop")}</th><th>Delta ${explain("delta")}</th>${extra.map((k) => `<th>${labels[k]} ${explain(k)}</th>`).join("")}<th>${u.side === "buy" ? "Ask" : "Bid"}</th></tr></thead><tbody>${html}</tbody></table>${rows.length ? "" : '<p class="empty">No contracts match the selected criteria. Adjust the filter; no trade is valid.</p>'}</div>`;
    $$("[data-expand]").forEach(
      (e) =>
        (e.onclick = () => {
          const c = contract(Number(e.dataset.expand));
          u.open.has(key(c)) ? u.open.delete(key(c)) : u.open.add(key(c));
          renderTable();
        }),
    );
    $$("[data-analyze]").forEach(
      (e) =>
        (e.onclick = () => {
          u.selected = contract(Number(e.dataset.analyze));
          u.tab = "returns";
          remember(u.selected);
          render();
        }),
    );
    $$("[data-price]").forEach(
      (e) =>
        (e.onclick = () => {
          u.selected = contract(Number(e.dataset.price));
          u.order = { strike: u.selected.strike };
          ctx.onSelect?.();
          remember(u.selected);
          ticket(u.selected);
          renderTable();
        }),
    );
    requestAnimationFrame(() => {
      const scroller = $(".broker-table"),
        divider = $("[data-price-divider]");
      if (scroller && divider)
        scroller.scrollTop = center
          ? Math.max(
              0,
              divider.getBoundingClientRect().top -
                scroller.getBoundingClientRect().top -
                scroller.clientHeight / 2,
            )
          : oldScroll;
    });
  }
  function ticket(c) {
    $(".chain-layout").classList.add("with-ticket");
    const lots = ctx.positions(c),
      lotsHtml = lots
        .map(
          (l) =>
            `<option value="${esc(l.id)}">${l.qty} contracts · entry ${usd(l.entryPremium)}</option>`,
        )
        .join("");
    $("#bcTicket").innerHTML =
      `<section class="broker-ticket"><h3>${u.side === "buy" ? "Buy to open" : "Sell to close"} ${esc(c.ticker)} ${c.strike} ${c.type}</h3><p>${new Date(c.expiry).toISOString().slice(0, 10)} · ${c.days.toFixed(2)} DTE · 100-share multiplier</p><form id="bcOrder">${u.side === "sell" ? `<label>Owned long lot<select id="bcLot">${lotsHtml}</select></label>` : ""}<label>Contracts<input id="bcQty" type="number" min="1" max="100" step="1" value="1" required></label><label>Order type<select id="bcKind"><option>Market</option>${ctx.limit && u.side === "buy" ? "<option>Limit</option>" : ""}</select></label><label id="bcLimitLabel" hidden>Limit premium / share<input id="bcLimit" type="number" min=".01" step=".01" value="${c.ask.toFixed(2)}"></label>${ctx.replay && u.side === "buy" ? `<label>Premium stop<input id="bcStop" type="number" min="0" step=".01" value="${(c.ask * 0.7).toFixed(2)}"></label><label>Premium target<input id="bcTarget" type="number" step=".01" value="${(c.ask * 1.6).toFixed(2)}"></label><label>Planned account risk %<input id="bcRisk" type="number" min=".01" max="10" step=".01" value=".75"></label>` : ""}<label>Entry / exit rationale<input id="bcReason" maxlength="1000"></label><div id="bcEstimate" role="status"></div><p>${u.side === "sell" ? "Only this owned long lot can be closed. No new short exposure. Market close only." : ctx.limit ? "Limit buys are conditional, evaluated on a later simulation step and revalidated for funds." : "Only immediate market orders are supported for manual snapshots."}</p><button class="primary" ${u.side === "sell" && !lots.length ? "disabled" : ""}>Review order</button><button type="button" id="bcAnalyze">Analyze returns</button></form><div id="bcReview"></div></section>`;
    const read = () => {
      const qty = Number($("#bcQty").value);
      if (!Number.isInteger(qty) || qty < 1 || qty > 100)
        throw Error("Choose 1–100 whole contracts");
      return {
        contract: c,
        side: u.side,
        qty,
        kind: $("#bcKind").value,
        limit: Number($("#bcLimit").value),
        lot: $("#bcLot")?.value,
        stop: Number($("#bcStop")?.value),
        target: Number($("#bcTarget")?.value),
        riskPercent: Number($("#bcRisk")?.value),
        reason: $("#bcReason").value,
      };
    };
    const estimate = () => {
      $("#bcReview").innerHTML = "";
      try {
        const o = read(),
          premium =
            o.kind === "Limit"
              ? o.limit
              : u.side === "buy"
                ? c.ask + c.slippage
                : Math.max(0, c.bid - c.slippage),
          fees = c.fee * o.qty,
          total = premium * 100 * o.qty,
          lot = lots.find((l) => l.id === o.lot),
          impact = u.side === "buy" ? total + fees : -(total - fees),
          maxLoss =
            u.side === "buy"
              ? total + fees * 2
              : (lot?.entryPremium ?? 0) * 100 * o.qty;
        $("#bcLimitLabel").hidden = o.kind !== "Limit";
        $("#bcEstimate").innerHTML =
          `<p>Estimated ${u.side === "buy" ? "debit" : "credit"} <strong>${usd(u.side === "buy" ? total + fees : total - fees)}</strong><br>Entry/exit fees ${usd(fees)}<br>Buying power impact ${impact >= 0 ? "−" : "+"}${usd(Math.abs(impact))}<br>${u.side === "buy" ? "Maximum paid premium exposure" : "Original premium basis"} ${usd(maxLoss)}<br>${u.side === "sell" ? "Remaining exposure after close: $0 for this quantity." : "Expiration break-even " + usd(expirationStats(assumptions(c, premium)).breakeven)}</p>`;
      } catch (e) {
        $("#bcEstimate").textContent = e.message;
      }
    };
    $$("#bcOrder input,#bcOrder select").forEach((e) => (e.oninput = estimate));
    $("#bcKind").onchange = estimate;
    $("#bcAnalyze").onclick = () => {
      u.tab = "returns";
      u.order = null;
      remember(c);
      render();
    };
    $("#bcOrder").onsubmit = (e) => {
      e.preventDefault();
      try {
        const o = read(),
          fresh = contract(c.strike);
        if (
          o.side === "sell" &&
          !lots.some((l) => l.id === o.lot && l.qty >= o.qty)
        )
          throw Error("Quantity exceeds owned long lot");
        if (o.kind === "Limit" && (!Number.isFinite(o.limit) || o.limit <= 0))
          throw Error("Use a positive limit");
        ctx.check(o);
        const stamp = [fresh.time, fresh.spot, fresh.bid, fresh.ask].join("|");
        $("#bcReview").innerHTML =
          `<h4>Review simulated ${u.side === "buy" ? "buy" : "owned-long close"}</h4><p>${o.qty} × ${esc(c.ticker)} ${c.strike} ${c.type} · ${o.kind}</p><p>Review the debit/credit, fees and exposure above. ${u.side === "sell" ? "This is not a short opening." : ""}</p><button id="bcSubmit" class="primary">Submit simulated order</button><button id="bcBack">Edit order</button>`;
        $("#bcBack").onclick = () => ($("#bcReview").innerHTML = "");
        $("#bcSubmit").onclick = () => {
          try {
            const latest = contract(c.strike);
            if (
              [latest.time, latest.spot, latest.bid, latest.ask].join("|") !==
              stamp
            )
              throw Error(
                "Simulation quote changed; review this contract again",
              );
            ctx.check(o);
            ctx.submit(o);
            u.order = null;
            ctx.persist(false);
            ctx.refresh();
            ctx.toast("Simulated order recorded. View positions and journal.");
          } catch (err) {
            ctx.toast(err.message);
          }
        };
      } catch (err) {
        ctx.toast(err.message);
      }
    };
    estimate();
  }
  function renderReturns(c) {
    const a = assumptions(c);
    if (!Number.isFinite(a.iv)) a.iv = 0.3;
    $("#bcContent").innerHTML =
      `<section class="chain-returns"><h3>${c.strike} ${c.type} · Simulated Returns</h3><p>${u.side === "sell" ? "Hypothetical short payoff only. Short opening is disabled; this graph does not represent selling an owned long to close." : "Long-option model analysis, not a fill promise."} ${c.iv === null ? "IV is a user-adjustable assumption, not inferred from the manual quote." : ""}</p><div class="chain-filter"><label>Contracts<input id="bcReturnQty" type="number" min="1" max="100" step="1" value="1"></label><label>Future underlying · USD<input id="bcFutureSpot" type="number" min=".01" step=".01" value="${c.spot}"></label><label>Evaluation date/time · UTC<input id="bcEval" type="datetime-local" step="1" min="${new Date(c.time).toISOString().slice(0, 19)}" max="${new Date(c.expiry).toISOString().slice(0, 19)}" value="${new Date(c.expiry).toISOString().slice(0, 19)}"></label><label>IV · %<input id="bcReturnIV" type="number" min="0" max="500" step=".1" value="${a.iv * 100}"></label><label>Entry premium · per share<input id="bcPremium" type="number" min="0" step=".01" value="${a.premium.toFixed(2)}"></label></div><div class="chain-actions"><button id="bcAtExpiry">Payoff at expiration</button><button id="bcAtNow">Theoretical value now</button><button id="bcChoose">Select this contract</button><button data-handoff="lab">Open Options Lab</button><button data-handoff="strategy">Use in strategy draft</button></div><div id="bcReturnsOutput" role="status"></div></section>`;
    const calculate = () => {
      try {
        const model = {
            ...a,
            premium: Number($("#bcPremium").value),
            iv: Number($("#bcReturnIV").value) / 100,
          },
          future = Number($("#bcFutureSpot").value),
          qty = Number($("#bcReturnQty").value),
          evalTime = Date.parse($("#bcEval").value + "Z"),
          value = returnsValue(model, future, evalTime, c.time, c.expiry, qty),
          greeks = modelQuote(
            c.type,
            future,
            c.strike,
            c.expiry,
            evalTime,
            model.iv,
            { ...defaults, rate: c.rate, dividend: c.dividend },
          );
        $("#bcReturnsOutput").innerHTML = `<div class="chain-metrics">${[
          ["Theoretical option / share", usd(value.value)],
          ["Estimated P/L", usd(value.pnl)],
          ["Return on premium", pct(value.return)],
          ["Expiry break-even", usd(value.breakeven)],
          ["Max terminal profit", usd(value.maxProfit * 100 * qty)],
          ["Max possible loss", usd(value.maxLoss * 100 * qty)],
          ["Remaining time value / share", usd(value.remainingTimeValue)],
          ["Delta", greeks.delta.toFixed(3)],
          ["Gamma", greeks.gamma.toFixed(3)],
          ["Theta / day", usd(greeks.theta)],
          ["Vega / IV point", usd(greeks.vega)],
        ]
          .map(([k, v]) => `<div><span>${k}</span><strong>${v}</strong></div>`)
          .join(
            "",
          )}</div><p>Current ${usd(c.spot)} · future input ${usd(future)} · expiry break-even ${usd(value.breakeven)}. ${evalTime === c.expiry ? "Expiration intrinsic payoff" : "Pre-expiration theoretical value"}; ${usd(c.fee * 2 * qty)} round-trip fees included. Rate ${(c.rate * 100).toFixed(1)}%, dividend ${(c.dividend * 100).toFixed(1)}%, 365-day year. Spread/slippage beyond entry premium are not future executable quotes.</p>${payoffGraph(model, c.time, c.expiry, evalTime, qty, future)}`;
        $(".chain-payoff").onclick = (e) => {
          const svg = e.currentTarget,
            r = svg.getBoundingClientRect(),
            xx = ((e.clientX - r.left) * 760) / r.width,
            f =
              Number(svg.dataset.lo) +
              ((Math.max(55, Math.min(675, xx)) - 55) / 620) *
                (Number(svg.dataset.hi) - Number(svg.dataset.lo));
          $("#bcFutureSpot").value = f.toFixed(2);
          calculate();
        };
      } catch (e) {
        $("#bcReturnsOutput").textContent = e.message;
      }
    };
    $$(".chain-returns input").forEach((e) => (e.oninput = calculate));
    $("#bcAtExpiry").onclick = () => {
      $("#bcEval").value = new Date(c.expiry).toISOString().slice(0, 19);
      calculate();
    };
    $("#bcAtNow").onclick = () => {
      $("#bcEval").value = new Date(c.time).toISOString().slice(0, 19);
      calculate();
    };
    $("#bcChoose").onclick = () => {
      u.order = { strike: c.strike };
      u.tab = "chain";
      remember(c);
      render();
    };
    $$("[data-handoff]").forEach(
      (e) =>
        (e.onclick = () => {
          remember(c);
          ctx.handoff(e.dataset.handoff);
        }),
    );
    calculate();
  }
  render();
  return { refresh: render };
}
