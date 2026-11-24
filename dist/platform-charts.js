import { indicators } from "./platform-engine.js?v=382f06ff093b";
export const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function plot(values, label) {
  const data = values.filter(Number.isFinite);
  if (!data.length) return '<p class="empty">No observations yet.</p>';
  const lo = Math.min(...data),
    hi = Math.max(...data),
    y = (n) => 160 - ((n - lo) / (hi - lo || 1)) * 130;
  return `<svg class="pm-plot" viewBox="0 0 660 200" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title><line x1="40" x2="640" y1="160" y2="160" stroke="#526157"/><polyline points="${data.map((n, i) => `${40 + (i * 590) / Math.max(1, data.length - 1)},${y(n)}`).join(" ")}" fill="none" stroke="#b3ef7c" stroke-width="2"/><text x="40" y="20">${esc(label)} · max ${hi.toFixed(2)}</text><text x="40" y="190">Observation order · min ${lo.toFixed(2)}</text></svg>`;
}
export function marketChart(
  bars,
  {
    title = "Synthetic completed candles",
    lines = [],
    drawings = [],
    positions = [],
    trades = [],
    history = [],
    chartId = "marketSvg",
  } = {},
) {
  if (!bars.length) return "<p>No available bars.</p>";
  const min = Math.min(...bars.map((b) => b.low)),
    max = Math.max(...bars.map((b) => b.high)),
    span = Math.max(0.1, max - min),
    lo = min - span * 0.1,
    hi = max + span * 0.1,
    y = (v) => 35 + ((hi - v) / (hi - lo)) * 240,
    x = (i) => 50 + ((i + 0.5) * 620) / bars.length,
    w = Math.min(12, 400 / bars.length),
    raw = indicators(history.length ? history : bars),
    ind = history.length
      ? Object.fromEntries(
          Object.entries(raw).map(([k, values]) => [
            k,
            bars.map(
              (b) => values[history.findIndex((x) => x.time === b.time)],
            ),
          ]),
        )
      : raw,
    volume = Math.max(...bars.map((b) => b.volume));
  const svg = `<svg id="${chartId}" class="pm-candles" viewBox="0 0 760 390" role="img" aria-label="${esc(title)}. Future bars excluded." data-lo="${lo}" data-hi="${hi}"><title>${esc(title)}</title><desc>Original synthetic OHLCV, unless an imported dataset is explicitly selected. Scale uses displayed candles only.</desc><rect x="45" y="30" width="640" height="250" fill="#101713"/>${[
    0, 1, 2, 3, 4,
  ]
    .map((i) => {
      const v = hi - ((hi - lo) * i) / 4;
      return `<line x1="45" x2="685" y1="${y(v)}" y2="${y(v)}" stroke="#344139"/><text x="690" y="${y(v) + 4}">${v.toFixed(2)}</text>`;
    })
    .join("")}${bars
    .map((b, i) => {
      const color = b.close >= b.open ? "#b3ef7c" : "#ff9a9a";
      return `<g><title>${new Date(b.time).toISOString()} O ${b.open.toFixed(2)} H ${b.high.toFixed(2)} L ${b.low.toFixed(2)} C ${b.close.toFixed(2)} V ${b.volume}</title><line x1="${x(i)}" x2="${x(i)}" y1="${y(b.high)}" y2="${y(b.low)}" stroke="${color}"/><rect x="${x(i) - w / 2}" y="${Math.min(y(b.open), y(b.close))}" width="${w}" height="${Math.max(1, Math.abs(y(b.open) - y(b.close)))}" fill="${color}"/><rect x="${x(i) - w / 2}" y="${335 - (b.volume / volume) * 40}" width="${w}" height="${(b.volume / volume) * 40}" fill="${color}" opacity=".5"/></g>`;
    })
    .join("")}${lines
    .filter((k) => ind[k])
    .map(
      (k, i) =>
        `<polyline points="${ind[k]
          .map((v, i) => (v !== null ? `${x(i)},${y(v)}` : ""))
          .filter(Boolean)
          .join(
            " ",
          )}" fill="none" stroke="${["#85bdfa", "#d6adf3", "#f5ca83", "#e1e9dc", "#66cfc5"][i % 5]}" stroke-width="1.5"/>`,
    )
    .join("")}${drawings
    .map((d) =>
      d.type === "trend"
        ? `<line x1="${x(
            Math.max(
              0,
              bars.findIndex((b) => b.time >= d.time1),
            ),
          )}" x2="${x(
            Math.max(
              0,
              bars.findIndex((b) => b.time >= d.time2),
            ),
          )}" y1="${y(d.price)}" y2="${y(d.price2)}" stroke="#f5ca83" stroke-width="2"/>`
        : `<line x1="45" x2="685" y1="${y(d.price)}" y2="${y(d.price)}" stroke="#f5ca83" stroke-dasharray="5 3"/><text x="50" y="${y(d.price) - 5}">${esc(d.label || d.type)} ${Number(d.price).toFixed(2)}</text>`,
    )
    .join(
      "",
    )}${positions.map((p) => `<line x1="45" x2="685" y1="${y(p.entrySpot)}" y2="${y(p.entrySpot)}" stroke="#88bdf7" stroke-dasharray="4 3"/><text x="250" y="${y(p.entrySpot) - 4}">Entry ${esc(p.type)} · premium stop ${p.stop.toFixed(2)} / target ${p.target.toFixed(2)}</text>`).join("")}${trades
    .filter((t) => t.exitTime >= bars[0].time && t.exitTime <= bars.at(-1).time)
    .map(
      (t) =>
        `<circle cx="${x(bars.findIndex((b) => b.time >= t.exitTime))}" cy="${y(t.exitSpot)}" r="5" fill="#ffbd73"><title>Exit ${esc(t.exitReason)}</title></circle>`,
    )
    .join(
      "",
    )}<line data-cross-x x1="0" x2="0" y1="30" y2="280" stroke="#fff" opacity=".3"/><line data-cross-y x1="45" x2="685" y1="0" y2="0" stroke="#fff" opacity=".3"/><text x="45" y="365">${new Date(bars[0].time).toISOString().slice(0, 16)} to ${new Date(bars.at(-1).time).toISOString().slice(0, 16)} UTC</text><text x="45" y="385">${esc(title)} · Volume max ${volume.toLocaleString()}</text></svg>`;
  return `<div class="pm-chart-scroll">${svg}</div><output id="${chartId}-readout" aria-live="off">Hover for price/time. Keyboard users: open candle data below.</output><details><summary>Accessible OHLCV data</summary><div class="table-wrap"><table><thead><tr>${["Time UTC", "Open", "High", "Low", "Close", "Volume"].map((t) => `<th>${t}</th>`).join("")}</tr></thead><tbody>${bars.map((b) => `<tr><td>${new Date(b.time).toISOString()}</td>${["open", "high", "low", "close"].map((k) => `<td>${b[k].toFixed(2)}</td>`).join("")}<td>${b.volume}</td></tr>`).join("")}</tbody></table></div></details>`;
}
export function bindCrosshair(bars, onPick) {
  const svg = document.querySelector("#marketSvg");
  if (!svg) return;
  const point = (e) => {
    const r = svg.getBoundingClientRect(),
      xx = ((e.clientX - r.left) * 760) / r.width,
      yy = ((e.clientY - r.top) * 390) / r.height,
      lo = Number(svg.dataset.lo),
      hi = Number(svg.dataset.hi);
    return {
      x: xx,
      y: yy,
      price: hi - ((yy - 35) / 240) * (hi - lo),
      bar: bars[
        Math.max(
          0,
          Math.min(
            bars.length - 1,
            Math.floor(((xx - 50) / 620) * bars.length),
          ),
        )
      ],
    };
  };
  svg.onpointermove = (e) => {
    const p = point(e);
    svg.querySelector("[data-cross-x]").setAttribute("x1", p.x);
    svg.querySelector("[data-cross-x]").setAttribute("x2", p.x);
    svg.querySelector("[data-cross-y]").setAttribute("y1", p.y);
    svg.querySelector("[data-cross-y]").setAttribute("y2", p.y);
    document.querySelector("#" + svg.id + "-readout").textContent =
      new Date(p.bar.time).toISOString() + " · " + p.price.toFixed(2) + " USD";
  };
  if (onPick) svg.onclick = (e) => onPick(point(e));
}
