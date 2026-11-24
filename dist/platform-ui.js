import { mountChain } from "./chain-ui.js?v=382f06ff093b";
import {
  replayLots,
  checkReplayOrder,
  submitReplayOrder,
} from "./chain-orders.js?v=382f06ff093b";
import {
  freshPlatform,
  regimes,
  visible,
  aggregate,
  indicators,
  chain,
  enter,
  exit,
  advance,
  equity,
  newReplay,
  queueOrder,
  modelQuote,
  positionSize,
  templates,
  strategy,
  validateStrategy,
  scenario,
  backtest,
  importDataset,
  analytics,
  defaults,
  number,
} from "./platform-engine.js?v=382f06ff093b";
import {
  hourlyLessons,
  library,
  patternFigure,
  categories,
  advancedQuestion,
} from "./hourly-content.js?v=382f06ff093b";
import { esc, plot, marketChart, bindCrosshair } from "./platform-charts.js?v=382f06ff093b";
import { price, intrinsic } from "./pricing.js?v=382f06ff093b";
let ctx,
  timer = null,
  view = {
    timeframe: 60,
    window: 60,
    speed: 2,
    steps: 4,
    pan: 0,
    lines: ["ema9", "ema20", "vwap"],
    category: categories[0],
    question: 0,
    advancedFrame: "1 hour",
    difficulty: "All",
    direction: "All",
    pattern: "All",
    answer: null,
    feedback: false,
    lab: null,
  };
const $ = (s) => document.querySelector(s),
  $$ = (s) => Array.from(document.querySelectorAll(s)),
  val = (id) => $("#" + id).value,
  n = (id) => Number(val(id)),
  p = () => ctx.state.platform;
const usd = (v) =>
  v === null || v === undefined
    ? "Not enough data"
    : Number.isFinite(v)
      ? v.toLocaleString("en-US", { style: "currency", currency: "USD" })
      : "Unbounded / no losses";
const pct = (v) =>
  v === null ? "Not enough data" : (v * 100).toFixed(1) + "%";
const options = (arr, value) =>
  arr
    .map((x) => {
      const v = typeof x === "object" ? x.value : x,
        label = typeof x === "object" ? x.label : x;
      return `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(label)}</option>`;
    })
    .join("");
const parameterLabels = {
  volume: "Minimum relative volume",
  stopPercent: "Premium stop distance %",
  targetR: "Target reward / planned risk",
  maxHold: "Maximum hourly holding buckets",
  minDte: "Minimum calendar DTE",
  maxDte: "Maximum calendar DTE",
  minDelta: "Minimum absolute delta",
  maxDelta: "Maximum absolute delta",
  maxSpread: "Maximum proportional bid-ask spread",
  maxIv: "Maximum IV (decimal)",
  riskPercent: "Planned risk per trade %",
  dailyLoss: "Daily realized-loss limit %",
  maxPositions: "Maximum concurrent positions",
  spread: "Full proportional bid-ask spread",
  commission: "Fee / contract / side (USD)",
  slippage: "Slippage / share / side (USD)",
  liquidity: "Maximum contracts per fill",
  rate: "Risk-free annual rate (decimal)",
  dividend: "Dividend yield (decimal)",
  iv: "Base IV (decimal; scales scenario IV)",
  lessons: "Required hourly modules",
  accuracy: "Minimum decision accuracy (0–1)",
  attempts: "Required decisions per skill",
  replayTrades: "Required replay trades",
  adherence: "Minimum reviewed adherence (0–1)",
};
const field = (id, label, value, type = "number", attrs = "") =>
  `<label>${label}<input id="${id}" type="${type}" value="${esc(value)}" ${type === "number" ? 'step="any"' : ""} ${attrs}></label>`;
const select = (id, label, values, value) =>
  `<label>${label}<select id="${id}">${options(values, value)}</select></label>`;
function save() {
  ctx.persist(false);
}
function safe(fn) {
  return (...args) => {
    try {
      fn(...args);
    } catch (e) {
      ctx.toast(e.message);
    }
  };
}
function page(title, description, html) {
  $("#page").innerHTML =
    `<div class="pm2 training"><div class="eyebrow">PaperMoney 2.0 · Hourly options workspace</div><h1>${title}</h1><p>${description}</p>${html}</div>`;
}
function download(name, data, type = "application/json") {
  const a = document.createElement("a"),
    url = URL.createObjectURL(new Blob([data], { type }));
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csv(rows) {
  if (!rows.length) return "";
  const keys = [...new Set(rows.flatMap(Object.keys))];
  return [
    keys,
    ...rows.map((r) =>
      keys.map((k) => {
        const v =
          typeof r[k] === "object" ? JSON.stringify(r[k]) : String(r[k] ?? "");
        return typeof r[k] === "string" && /^[=+@\-]/.test(v) ? "'" + v : v;
      }),
    ),
  ]
    .map((row) =>
      row.map((s) => '"' + String(s).replaceAll('"', '""') + '"').join(","),
    )
    .join("\n");
}
function metricsHTML(m) {
  return `<div class="grid stats">${[
    ["Trades", m.count],
    ["Win rate", pct(m.winRate)],
    ["Net P/L", usd(m.net)],
    ["Net return", pct(m.return)],
    [
      "Profit factor",
      m.profitFactor === null
        ? m.wins > 0 && !m.losses
          ? "No losing trades"
          : "Not enough data"
        : Number.isFinite(m.profitFactor)
          ? m.profitFactor.toFixed(2)
          : "No losing trades",
    ],
    ["Expectancy / trade", usd(m.expectancy)],
    ["Max drawdown", pct(m.maxDrawdown)],
    ["Average R", m.averageR?.toFixed(2) ?? "Not enough data"],
    ["Average winner", usd(m.averageWinner)],
    ["Average loser", usd(m.averageLoser)],
    ["Holding hours", m.averageHoldingHours?.toFixed(1) ?? "Not enough data"],
    ["Fees + slippage impact", usd(m.costs)],
    ["Max win / loss streak", m.maxWins + " / " + m.maxLosses],
  ]
    .map(([k, v]) => `<div class="card"><small>${k}</small><h3>${v}</h3></div>`)
    .join("")}</div>`;
}
export function renderPlatform(context, route) {
  ctx = context;
  ctx.state.platform ??= freshPlatform();
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (route === "Pattern Library") return patternLibrary();
  if (route === "Market Replay") return replay();
  if (route === "Options Lab") return lab();
  if (route === "Strategies") return strategiesPage();
  if (route === "Backtesting") return testingPage();
  if (route === "Trading Journal") return journal();
  if (route === "Development") return development();
}
export function renderHourly(context) {
  ctx = context;
  ctx.state.platform ??= freshPlatform();
  const id = decodeURIComponent(location.hash).split("/")[2],
    lesson = hourlyLessons.find((l) => l.id === id);
  if (!lesson) {
    page(
      "1-Hour Options Trading Masterclass",
      "15 progressive modules. Original examples; no live-trading certification.",
      `<a href="#Guided%20Lessons">All learning tracks</a><p>${p().hourlyCompleted.length} / 15 modules completed</p><div class="grid lesson-grid">${hourlyLessons.map((l, i) => `<article class="card"><small>${l.difficulty} · ${p().hourlyCompleted.includes(l.id) ? "Completed" : "Not completed"}</small><h2>${i + 1}. ${l.title}</h2><p>${l.objective}</p><a href="#Guided%20Lessons/hourly/${l.id}">Study module</a></article>`).join("")}</div>`,
    );
    return;
  }
  const progress = p().hourlyProgress[lesson.id] || {
      exercise: false,
      checks: false,
    },
    i = hourlyLessons.indexOf(lesson),
    f = patternFigure(i);
  page(
    lesson.title,
    lesson.objective,
    `<a href="#Guided%20Lessons/hourly">All hourly modules</a><p>${lesson.difficulty} · about 10 minutes</p><section class="card"><h2>Concept and limitations</h2><p>${lesson.theory}</p><h3>Original worked example</h3><p>${lesson.example}</p>${marketChart(f.bars, { title: "Original hourly structure illustration; not a forecast" })}<div class="grid cols"><div><h3>Successful process</h3><p>${lesson.success}</p></div><div><h3>Failed setup</h3><p>${lesson.failure}</p></div></div><h3>Common mistake</h3><p>${lesson.mistake}</p><h3>Options application</h3><p>${lesson.application}</p><p>Prerequisites: <a href="#Guided%20Lessons/options">Options foundations</a> and <a href="#Guided%20Lessons/day">stock study track (${esc(lesson.prerequisite)})</a>.</p></section><section class="card section-gap"><h2>Interactive exercise</h2><p>${lesson.exercise}</p><form id="hourExercise">${field("hourAnswer", "Numerical answer", progress.answer ?? "")}<button>Check exercise</button></form><p id="hourExerciseResult" role="status">${progress.exercise ? "Exercise correct." : ""}</p><h2>Knowledge assessment</h2><form id="hourChecks">${lesson.checks.map((c, j) => `<fieldset><legend>${c.prompt}</legend>${c.options.map((text, k) => `<label class="answer-option"><input type="radio" name="check${j}" value="${k}" required>${esc(text)}</label>`).join("")}</fieldset>`).join("")}<button>Check understanding</button></form><p id="hourCheckResult" role="status">${progress.checks ? "Assessment correct." : ""}</p><h3>Notebook recap</h3><p>Write your observation, the rule that would invalidate it, the contract constraints, and a reason to wait. ${lesson.objective}</p><button id="hourComplete" class="primary" ${progress.exercise && progress.checks ? "" : "disabled"}>${p().hourlyCompleted.includes(lesson.id) ? "Completion saved" : "Complete module"}</button><p>${lesson.source} <a href="https://www.optionseducation.org/advancedconcepts/volatility-the-greeks" target="_blank" rel="noopener">OIC model references</a>.</p></section><div class="row section-gap">${i ? `<a href="#Guided%20Lessons/hourly/${hourlyLessons[i - 1].id}">Previous module</a>` : ""}${i < 14 ? `<a href="#Guided%20Lessons/hourly/${hourlyLessons[i + 1].id}">Next module</a>` : ""}<a href="#Challenges/hourly">Practice hourly concepts</a><a href="#Market%20Replay">Open Market Replay</a></div>`,
  );
  bindCrosshair(f.bars);
  const unlock = () =>
    ($("#hourComplete").disabled = !(progress.exercise && progress.checks));
  $("#hourExercise").onsubmit = (e) => {
    e.preventDefault();
    progress.answer = n("hourAnswer");
    progress.exercise =
      val("hourAnswer") !== "" &&
      Math.abs(progress.answer - lesson.answer) < 0.011;
    p().hourlyProgress[lesson.id] = progress;
    save();
    $("#hourExerciseResult").textContent = progress.exercise
      ? "Correct. " + lesson.example
      : "Review the worked example, then try again.";
    unlock();
  };
  $("#hourChecks").onsubmit = (e) => {
    e.preventDefault();
    progress.checks = lesson.checks.every(
      (c, j) =>
        Number($(`input[name="check${j}"]:checked`)?.value) === c.correct,
    );
    p().hourlyProgress[lesson.id] = progress;
    save();
    $("#hourCheckResult").textContent = progress.checks
      ? "Correct. A process can be sound and still lose."
      : "Review the objective and uncertainty discussion. Predictions and badges do not guarantee profit.";
    unlock();
  };
  $("#hourComplete").onclick = () => {
    if (
      progress.exercise &&
      progress.checks &&
      !p().hourlyCompleted.includes(lesson.id)
    ) {
      p().hourlyCompleted.push(lesson.id);
      save();
    }
    $("#hourComplete").textContent = "Completion saved";
  };
}
function patternLibrary() {
  const id = decodeURIComponent(location.hash).split("/")[1],
    item = library.find((x) => x.id === id);
  if (item) {
    if (!p().patternViewed.includes(id)) {
      p().patternViewed.push(id);
      save();
    }
    const i = library.indexOf(item),
      f = patternFigure(i),
      after = patternFigure(i, "1 hour", "success"),
      failed = patternFigure(i, "1 hour", "failure");
    page(
      item.title,
      item.explanation,
      `<a href="#Pattern%20Library">Back to library</a><p>${item.category} · ${item.bias} · ${item.type} · ${item.difficulty}</p><p>${item.category === "Hourly priority" ? "Adapted for multi-session hourly analysis." : "Requires explicit session context; minute-based tactics are not directly transferable to hourly options."}</p><section class="card">${marketChart(f.bars, { title: "Original illustrative hourly candles" })}<div class="grid cols">${[
        [
          "Market conditions",
          "Use liquid modeled contracts and assess completed higher-timeframe structure. Avoid treating one chart as sufficient context.",
        ],
        ["Formation and visual structure", item.explanation],
        [
          "Entry and confirmation",
          "Define the relevant prior high/low zone. For continuation, require a completed close beyond it, then evaluate a later executable quote. For reversal, require a change in swing structure.",
        ],
        [
          "Invalidation and stop",
          "Predeclare a close back inside the zone or loss of the defended swing. A premium stop is a separate instruction and may slip through gaps.",
        ],
        [
          "Potential target",
          "Use an explicit next reference zone or a preset reward-to-planned-risk ratio; a measured move is a hypothesis.",
        ],
        [
          "Volume",
          "Compare equivalent session intervals. A shortened closing bucket has less time to accumulate volume.",
        ],
        [
          "Options application",
          "Choose calls for the stated bullish objective or puts for the bearish objective. Check DTE, absolute delta, spread, IV and full premium exposure. No qualifying contract means no trade.",
        ],
        [
          "Common mistakes",
          "Entering before the specified close, moving invalidation, chasing extension, or ignoring an IV event.",
        ],
        [
          "False breakout",
          "A wick crosses a boundary and closes back inside. A close-based rule remains unconfirmed.",
        ],
        [
          "Successful and unsuccessful scenarios",
          "A confirmed break can follow through, fail immediately, or reverse after a gap. The process score depends on predeclared rules, not only P/L.",
        ],
      ]
        .map(([k, v]) => `<div><h3>${k}</h3><p>${esc(v)}</p></div>`)
        .join(
          "",
        )}</div><p>Relevant timeframes: ${item.category === "Hourly priority" ? "1-hour, 4-hour and daily context" : "Intraday 1/5/15-minute context; hourly use needs adapted rules"}. The current illustration is hourly.</p><details><summary>Compare fictional continuation and failure outcomes</summary>${marketChart(after.bars, { chartId: "patternSuccess", title: "Illustrative continuation, not a forecast" })}${marketChart(failed.bars, { chartId: "patternFailure", title: "Illustrative failed structure, not a forecast" })}</details><p>Source concept: ChartPatternsv2.pdf, physical page ${item.source.pdfPage}, slide ${item.source.slide}. All hourly option rules and synthetic illustrations are original adaptations.</p><a href="#Guided%20Lessons/hourly/${item.lesson}">Associated hourly lesson</a> · <a href="#Challenges/topic/${item.id}">Original source-linked challenges</a> · <a href="#Challenges/hourly">Hourly practice</a></section>`,
    );
    bindCrosshair(f.bars);
    return;
  }
  page(
    "Pattern Library",
    "Search the preserved chart concepts, with hourly applicability separated from specialized intraday tactics.",
    `<div class="card"><div class="fields">${field("patternSearch", "Search", "", "search")}${select("patternCategory", "Timeframe applicability", ["All", "Hourly priority", "Intraday adaptation", "Specialized day trading"], "All")}${select("patternBias", "Direction", ["All", "bullish", "bearish", "neutral"], "All")}${select("patternType", "Type", ["All", "Reversal", "Continuation / context"], "All")}${select("patternDifficulty", "Difficulty", ["All", "Beginner", "Intermediate", "Advanced"], "All")}${select("patternProgress", "Learning progress", ["All", "Viewed", "Not viewed"], "All")}</div></div><div id="patternResults" class="grid lesson-grid section-gap"></div>`,
  );
  const filter = () => {
    $("#patternResults").innerHTML =
      library
        .filter(
          (x) =>
            (x.title + " " + x.explanation)
              .toLowerCase()
              .includes(val("patternSearch").toLowerCase()) &&
            [
              ["patternCategory", "category"],
              ["patternBias", "bias"],
              ["patternType", "type"],
              ["patternDifficulty", "difficulty"],
            ].every(([id, k]) => val(id) === "All" || val(id) === x[k]) &&
            (val("patternProgress") === "All" ||
              (val("patternProgress") === "Viewed") ===
                p().patternViewed.includes(x.id)),
        )
        .map(
          (x) =>
            `<article class="card"><small>${x.category} · ${x.bias}</small><h2>${x.title}</h2><p>${esc(x.explanation)}</p><a href="#Pattern%20Library/${x.id}">Explore pattern</a></article>`,
        )
        .join("") || '<p class="empty">No patterns match these filters.</p>';
  };
  $$(".pm2 input,.pm2 select").forEach((e) => (e.oninput = filter));
  filter();
}
export function renderAdvanced(context) {
  ctx = context;
  ctx.state.platform ??= freshPlatform();
  if (decodeURIComponent(location.hash).split("/")[2] === "scenario")
    return completeScenario();
  const pool = library
    .map((x, i) => ({ x, i }))
    .filter(
      ({ x }) =>
        (view.difficulty === "All" || x.difficulty === view.difficulty) &&
        (view.direction === "All" || x.bias === view.direction.toLowerCase()) &&
        (view.pattern === "All" || x.id === view.pattern),
    );
  const chosen = pool.length ? pool[view.question % pool.length].i : 0;
  const q = advancedQuestion(view.category, chosen, view.advancedFrame);
  const optionOrder = q.options
    ?.map((text, i) => ({ text, i }))
    .sort(
      (a, b) =>
        ((a.i * 7 + view.question * 3) % 5) -
        ((b.i * 7 + view.question * 3) % 5),
    );
  page(
    "Hourly Challenges",
    "Six skill categories. The original 92 questions and all prior attempts remain available.",
    `<div class="training-tabs"><a href="#Challenges">Original chart-guide practice</a><a href="#Challenges/hourly/scenario">Complete trading scenario</a></div><div class="card"><div class="fields">${select("advancedCategory", "Challenge category", categories, view.category)}${select("advancedTime", "Timeframe", ["1 hour", "15 minutes", "4 hours", "Daily", "1 minute", "5 minutes"], view.advancedFrame)}${select("advancedDifficulty", "Difficulty", ["All", "Beginner", "Intermediate", "Advanced"], view.difficulty)}${select("advancedPattern", "Pattern", ["All", ...library.map((x) => ({ value: x.id, label: x.title }))], view.pattern)}${select("advancedDirection", "Direction", ["All", "Bullish", "Bearish", "Neutral"], view.direction)}</div><p>Hourly examples use multi-session structure. Each interval has independently constructed illustration volatility and timestamps. Cross-timeframe replay uses consistent aggregation instead.</p><button id="newAdvanced">Load next scenario</button></div><section class="card section-gap"><h2>${esc(q.prompt)}</h2>${q.chart ? marketChart(q.chart.bars, { lines: ["vwap", "ema9"], title: "Original " + q.chart.timeframe + " exercise · only decision-time bars" }) : ""}${q.category === "Options Contract Selection" ? "<p>Simulated chain; prices per share, standard 100-share contracts. No current market quotes.</p>" : ""}${q.chain ? `<div class="table-wrap"><table><caption>Synthetic underlying $100 · standard 100-share contracts · no market quotes</caption><thead><tr>${["Contract", "Type", "Strike", "DTE", "IV", "Bid", "Ask", "Delta", "Gamma", "Theta/day", "Vega/1%"].map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${q.chain.map((c) => `<tr><td>${c.id}</td><td>${c.type}</td><td>${c.strike}</td><td>${c.dte}</td><td>${(c.iv * 100).toFixed(0)}%</td>${["bid", "ask", "delta", "gamma", "theta", "vega"].map((k) => `<td>${c[k].toFixed(3)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : ""}<form id="advancedForm">${q.kind === "choice" ? `<fieldset><legend>Decision</legend>${optionOrder.map(({ text, i }) => `<label class="answer-option"><input name="advancedAnswer" type="radio" value="${i}" required>${esc(text)}</label>`).join("")}</fieldset>` : field("advancedNumber", q.kind === "level" ? "Price level · USD" : "Numerical answer", "")}<button class="primary">Submit decision</button></form><div id="advancedFeedback" role="status"></div></section><p>${p().advancedAttempts.length} advanced decisions recorded. <a href="#Development">Review skill development</a></p>`,
  );
  $("#advancedCategory").onchange = () => {
    view.category = val("advancedCategory");
    if (view.category === "Complete Trading Scenarios") {
      location.hash = "#Challenges/hourly/scenario";
      return;
    }
    renderAdvanced(ctx);
  };
  $("#advancedTime").onchange = () => {
    view.advancedFrame = val("advancedTime");
    renderAdvanced(ctx);
  };
  $("#advancedDifficulty").onchange = () => {
    view.difficulty = val("advancedDifficulty");
    view.question = 0;
    renderAdvanced(ctx);
  };
  $("#advancedDirection").onchange = () => {
    view.direction = val("advancedDirection");
    view.question = 0;
    renderAdvanced(ctx);
  };
  $("#advancedPattern").onchange = () => {
    view.pattern = val("advancedPattern");
    view.question = 0;
    renderAdvanced(ctx);
  };
  $("#newAdvanced").onclick = () => {
    view.question++;
    renderAdvanced(ctx);
  };
  if (q.chart)
    bindCrosshair(
      q.chart.bars,
      q.kind === "level"
        ? (point) => {
            $("#advancedNumber").value = point.price.toFixed(2);
          }
        : null,
    );
  $("#advancedForm").onsubmit = (e) => {
    e.preventDefault();
    const answer =
      q.kind === "choice"
        ? Number($('input[name="advancedAnswer"]:checked')?.value)
        : n("advancedNumber");
    if (q.kind !== "choice" && val("advancedNumber") === "") return;
    const correct =
      q.kind === "choice"
        ? answer === q.correct
        : Math.abs(answer - q.answer) <= q.tolerance;
    p().advancedAttempts.push({
      id: crypto.randomUUID(),
      question: q.id,
      category: q.category,
      answer,
      correct,
      at: new Date().toISOString(),
    });
    save();
    $("#advancedFeedback").innerHTML =
      `<h3>${correct ? "Sound decision" : "Review this decision"}</h3><p>${esc(q.explanation)}</p>${q.kind === "numeric" ? `<p>Expected ${q.answer.toFixed(2)} ± ${q.tolerance}.</p>` : ""}${q.kind === "level" ? `<p>Expected support zone ${q.answer.toFixed(2)} ± ${q.tolerance}.</p>${marketChart(q.chart.bars, { chartId: "feedbackChart", drawings: [{ type: "support", price: q.answer }], title: "Feedback overlay after submission" })}` : ""}`;
    $("#advancedForm").querySelector("button").disabled = true;
  };
}
function guidedAssessment(step) {
  const tests = [
    [
      "What daily context is valid?",
      [
        "Only completed daily candles already visible",
        "The final close of the next session",
        "A daily chart generated independently of this market",
      ],
      0,
      "Higher timeframes must come from the same available base bars.",
    ],
    [
      "What establishes hourly structure?",
      [
        "One green candle",
        "A sequence of completed swing highs and lows",
        "The cheapest option premium",
      ],
      1,
      "Observe the sequence and define what would weaken it.",
    ],
    [
      "What does a named pattern establish?",
      [
        "A candidate requiring a separate trigger",
        "Guaranteed follow-through",
        "A certain measured target",
      ],
      0,
      "Recognition is not an entry or a forecast.",
    ],
    [
      "What is a long put appropriate for under a directional objective?",
      [
        "Unconditionally bullish exposure",
        "A bearish hypothesis with bounded premium exposure",
        "Eliminating all losses",
      ],
      1,
      "Long puts express bearish delta; IV, time and costs still matter.",
    ],
    [
      "If no completed trigger or qualifying contract exists, which decision can earn full process credit?",
      ["Wait / no trade", "Enter for activity points", "Double quantity"],
      0,
      "Patience is scored separately from profits.",
    ],
    [
      "After a completed-close signal, which entry avoids a hindsight fill?",
      [
        "Use the signal candle low after seeing its close",
        "Use a later available ask plus modeled slippage",
        "Assume the midpoint was executable",
      ],
      1,
      "The earlier low was not available as a retrospective fill.",
    ],
    [
      "What distinguishes a stock invalidation from maximum option loss?",
      [
        "They are identical",
        "The full paid premium plus fees can be lost even with a planned stop",
        "Stops eliminate gap risk",
      ],
      1,
      "Planned stop risk is not the maximum contractual loss.",
    ],
    [
      "Premium entry $3, stop $2, target $5: planned reward:risk before costs?",
      ["1R", "2R", "5R"],
      1,
      "Reward $2 divided by planned risk $1 is 2R.",
    ],
    [
      "A bullish objective requires 14–30 DTE, delta .50–.70 and narrow spreads. What if no chain row qualifies?",
      [
        "Pick any put",
        "Take the lowest premium",
        "No trade under this objective",
      ],
      2,
      "Contract constraints are part of the plan, not optional hindsight filters.",
    ],
    [
      "A $100 planned budget, entry $3, stop $2, $1.30 round-trip fees: maximum whole contracts?",
      ["0", "1", "2"],
      0,
      "One contract risks $101.30 under the plan; round down, never up.",
    ],
  ];
  return tests[step];
}
function completeScenario() {
  const r = p().replay,
    s = (p().guidedScenario ??= {
      step: 0,
      answers: [],
      startTradeCount: r.trades.length,
    }),
    stages = [
      "Daily context",
      "Hourly structure",
      "Pattern candidate",
      "Directional bias",
      "Trade or wait",
      "Entry plan",
      "Invalidation",
      "Target",
      "Contract selection",
      "Position size",
      "Execute paper trade",
      "Reveal later candles",
      "Manage position",
      "Exit position",
      "Review decision quality",
    ],
    bars = visible(r),
    hour = aggregate(bars, 60),
    daily = aggregate(bars, 390).slice(0, -1),
    current = stages[s.step],
    assessment = s.step < 10 ? guidedAssessment(s.step) : null;
  page(
    "Complete Trading Scenario",
    "Saved multi-stage workflow. Future candles remain hidden until you advance replay. Scores reward documentation and rule adherence, including waiting.",
    `<a href="#Challenges/hourly">All skill categories</a><progress value="${s.step}" max="15" aria-label="Scenario steps completed"></progress><h2>${Math.min(15, s.step + 1)} / 15 · ${current || "Completed"}</h2>${s.step < 2 ? marketChart((s.step === 0 ? daily : hour).slice(-40), { title: s.step === 0 ? "Completed daily context" : "Hourly decision-time context" }) : ""}<section class="card">${s.step < 10 ? `<form id="scenarioStep"><label>${current}<textarea id="scenarioAnswer" required maxlength="2000" placeholder="Record the observation, a testable rule and any uncertainty."></textarea></label>${s.step === 4 ? select("scenarioDecision", "Decision", ["Wait / no trade", "Plan long call", "Plan long put"], "Wait / no trade") : ""}<p>${s.step === 9 ? "Use Options Lab position sizing, then record whole contracts, planned loss and full premium loss." : "No profit forecast is required. A documented wait is a valid plan."}</p>${assessment ? `<fieldset><legend>${assessment[0]}</legend>${assessment[1].map((text, i) => `<label class="answer-option"><input type="radio" name="guidedDecision" value="${i}" required>${esc(text)}</label>`).join("")}</fieldset>` : ""}<button class="primary">Submit decision and save analysis</button></form>` : s.step === 10 ? `<p>Use the replay order ticket to execute your recorded plan, or explicitly record no trade. Return here to continue.</p><a href="#Market%20Replay">Open replay order ticket</a><button id="scenarioContinue">Record execution or disciplined no-trade decision</button>` : s.step === 11 ? `<button id="scenarioAdvance">Reveal next completed hour</button><p id="scenarioMarket"></p><button id="scenarioContinue">Continue after observation</button>` : s.step === 12 ? `<p>Check your invalidation and premium stop against the newly visible information. Do not revise the original risk to fit the result.</p><a href="#Market%20Replay">Manage replay positions</a><button id="scenarioContinue">Record management review</button>` : s.step === 13 ? `<p>${r.positions.length} open replay positions. Exit according to your plan or record the decision to continue a valid hold.</p><a href="#Market%20Replay">Replay positions and exits</a><button id="scenarioContinue">Record exit / hold review</button>` : `<p>Review each observation against the available information at that step. Profitability is reported separately in the replay journal.</p>${s.answers.map((a, i) => `<details><summary>${stages[i]}</summary><p>${esc(a)}</p></details>`).join("")}<p>Objective decision quality: ${(s.assessments || []).filter((a) => a.correct).length} / ${(s.assessments || []).length}. Profit or loss is excluded from this score.</p><p>Process record: ${s.answers.filter(Boolean).length} documented analysis stages. This is participation evidence, not a correctness or profitability certificate.</p><a href="#Trading%20Journal">Review automatic journal entries</a><button id="restartGuided">Start another analysis</button>`}</section>`,
  );
  bindCrosshair((s.step === 0 ? daily : hour).slice(-40));
  if ($("#scenarioStep"))
    $("#scenarioStep").onsubmit = (e) => {
      e.preventDefault();
      const decision = Number($('input[name="guidedDecision"]:checked')?.value),
        check = guidedAssessment(s.step),
        correct = decision === check[2];
      s.assessments ??= [];
      s.assessments[s.step] = { correct, answer: decision };
      p().advancedAttempts.push({
        id: crypto.randomUUID(),
        question: "guided-" + s.step,
        category: "Complete Trading Scenarios",
        answer: decision,
        correct,
        at: new Date().toISOString(),
      });
      ctx.toast((correct ? "Sound decision. " : "Review: ") + check[3]);
      s.answers[s.step] =
        val("scenarioAnswer") +
        (s.step === 4 ? " · " + val("scenarioDecision") : "");
      s.step++;
      save();
      completeScenario();
    };
  if ($("#scenarioContinue"))
    $("#scenarioContinue").onclick = () => {
      s.step++;
      save();
      completeScenario();
    };
  if ($("#scenarioAdvance"))
    $("#scenarioAdvance").onclick = () => {
      advance(r, 4);
      save();
      $("#scenarioMarket").textContent =
        "New visible close " +
        visible(r).at(-1).close.toFixed(2) +
        "; equity " +
        usd(equity(r));
    };
  if ($("#restartGuided"))
    $("#restartGuided").onclick = () => {
      p().guidedScenario = {
        step: 0,
        answers: [],
        startTradeCount: r.trades.length,
      };
      save();
      completeScenario();
    };
}
function replay() {
  const r = p().replay,
    bars = visible(r),
    all = aggregate(bars, view.timeframe),
    end = Math.max(1, all.length - view.pan),
    shown = all.slice(Math.max(0, end - view.window), end),
    b = bars.at(-1),
    quotes = chain(r),
    ind = indicators(all),
    last = (k) => ind[k].at(-1)?.toFixed(2) ?? "Warm-up required";
  page(
    "Market Replay",
    "Seeded synthetic DEMO market · separate replay account. Synthetic sessions use fixed EST weekdays; exchange holidays and DST changes are not modeled.",
    `<div class="grid stats">${[
      ["Equity", usd(equity(r))],
      ["Available cash", usd(r.cash)],
      ["Realized P/L", usd(r.realized)],
      [
        "Unrealized P/L",
        usd(equity(r) - r.cash - r.positions.reduce((n, p) => n + p.cost, 0)),
      ],
    ]
      .map(
        ([k, v]) => `<div class="card"><small>${k}</small><h3>${v}</h3></div>`,
      )
      .join(
        "",
      )}</div><section class="card"><div class="fields">${select("replayRegime", "Regime", regimes, r.regime)}${field("replaySeed", "Seed", r.seed, "number", 'step="1"')}${select("replayFrame", "Chart interval minutes", [15, 60, 240, 390], view.timeframe)}${select("replaySpeed", "Playback interval seconds", [1, 2, 5], view.speed)}${field("replaySteps", "Base bars per advance", view.steps, "number", 'min="1" max="104" step="1"')}</div><div class="row section-gap"><button id="restartReplay">Restart with these settings</button><button id="randomReplay">Random scenario</button><button id="advanceReplay" class="primary">Advance candles</button><button id="playReplay">Play</button><button id="pauseReplay">Pause</button><button id="zoomIn">Zoom in</button><button id="zoomOut">Zoom out</button><button id="panBack">Pan earlier</button><button id="panNow">Latest bars</button></div><p>As of ${new Date(b.time).toISOString()} UTC · ${r.cursor} visible 15-minute bars. Hourly chart is primary; daily = 390 minutes. Last buckets can be partial.</p><div class="row">${["ema9", "ema20", "sma50", "sma200", "vwap"].map((k) => `<label><input type="checkbox" data-indicator="${k}" ${view.lines.includes(k) ? "checked" : ""}>${k}</label>`).join("")}</div><p>RSI14 ${last("rsi")} · ATR14 ${last("atr14")}. Indicators require prior bars; VWAP resets each session.</p>${marketChart(shown, { title: "Synthetic DEMO · " + view.timeframe + " minute buckets", history: all, lines: view.lines, drawings: r.drawings, positions: r.positions, trades: r.trades })}<details><summary>Draw support, resistance or a trendline</summary><div class="fields">${select("drawType", "Tool", ["support", "resistance", "trend"], "support")}${field("drawPrice", "First price", b.close)}${field("drawPrice2", "Second price", b.close + 1)}${field("drawTime", "First UTC time", new Date(shown[0].time).toISOString(), "text")}${field("drawTime2", "Second UTC time", new Date(b.time).toISOString(), "text")}</div><p>Click chart to set first price. Numeric/time controls provide a keyboard alternative.</p><button id="addDrawing">Save drawing</button><button id="clearDrawings">Clear drawings</button></details></section><section class="card section-gap"><h2>Long call / put order ticket</h2><p>Market buys at ask plus slippage. Limit buys are checked against later completed-bar quotes, never filled from a prior low. Simulated liquidity caps size.</p><div id="replayBrokerChain"></div><details class="legacy-replay-ticket"><summary>Advanced replay ticket</summary><div class="table-wrap"><table><thead><tr>${["Select", "Strike", "Type", "DTE", "Bid", "Ask", "Δ", "Γ", "Θ/day", "Vega/1%"].map((t) => `<th>${t}</th>`).join("")}</tr></thead><tbody>${quotes.map((q, i) => `<tr><td><button data-contract="${i}">Select</button></td><td>${q.strike}</td><td>${q.type}</td><td>${q.days.toFixed(2)}</td><td>${q.bid.toFixed(2)}</td><td>${q.ask.toFixed(2)}</td>${["delta", "gamma", "theta", "vega"].map((k) => `<td>${q[k].toFixed(3)}</td>`).join("")}</tr>`).join("")}</tbody></table></div><form id="replayOrder"><div class="fields">${select("orderType", "Long option", ["call", "put"], "call")}${field("orderStrike", "Strike", Math.round(b.close))}${field("orderDte", "Calendar DTE", 21)}${field("orderQty", "Contracts", 1, "number", 'step="1"')}${select("orderKind", "Order kind", ["Market", "Limit"], "Market")}${field("orderLimit", "Limit premium", 3)}${field("orderStop", "Premium stop", 1)}${field("orderTarget", "Premium target", 8)}${field("orderRisk", "Planned account risk %", 0.75)}${select("orderStrategy", "Strategy", ["Discretionary", ...p().strategies.map((s) => s.name)], "Discretionary")}${field("orderPattern", "Pattern", "Unclassified", "text")}${field("orderReason", "Entry rationale", "", "text")}</div><button type="button" id="sizeReplay">Calculate size</button><output id="replaySize"></output><p id="orderReview"></p><button class="primary">Place paper order</button></form></details><div id="pendingOrders">${r.orders.map((o) => `<p>Pending ${o.type} ${o.strike} · limit ${o.limit} <button data-cancel="${esc(o.id)}">Cancel order</button></p>`).join("")}</div></section><section class="card section-gap"><h2>Open replay positions</h2>${r.positions.map((t) => `<article><h3>${t.qty} ${t.type} · ${t.strike}</h3><p>Entry ${t.entry.toFixed(2)} · planned risk ${usd(t.plannedRisk)} · maximum loss ${usd(t.maxLoss)}</p><div class="fields">${field("stop-" + t.id, "Premium stop", t.stop)}${field("target-" + t.id, "Premium target", t.target)}</div><button data-manage="${t.id}">Update management levels</button><button data-exit="${t.id}">Close at simulated bid</button></article>`).join("") || '<p class="empty">No open replay positions. Waiting is a valid choice.</p>'}<a href="#Trading%20Journal">Automatic replay journal (${r.trades.length} completed)</a></section><details class="card section-gap"><summary>Simulation assumptions and costs</summary><div class="fields">${Object.entries(
      r.settings,
    )
      .map(([k, v]) => field("setting-" + k, parameterLabels[k] || k, v))
      .join(
        "",
      )}</div><button id="saveReplayCosts">Apply to future fills and current marks</button><p>Spread is full proportional spread with a $0.01 half-spread floor. Slippage is dollars/share per side; commission dollars/contract per side. European model with continuous dividend yield. OHLC stops win simultaneous touches; gap stops use worse opening bid. Expiration uses educational intrinsic cash settlement, not share delivery. Costs and IV changes can create losses despite correct direction.</p></details>`,
  );
  mountChain($("#replayBrokerChain"), {
    scope: "replay",
    state: ctx.state,
    persist: ctx.persist,
    toast: ctx.toast,
    refresh: replay,
    synthetic: true,
    replay: true,
    rate: r.settings.rate,
    dividend: r.settings.dividend,
    fee: r.settings.commission,
    slippage: r.settings.slippage,
    limit: true,
    label: "Seeded synthetic DEMO · replay clock",
    time: () => visible(r).at(-1).time,
    iv: () => visible(r).at(-1).iv * (r.settings.iv / 0.3),
    tickers: () => ["DEMO"],
    spot: () => visible(r).at(-1).close,
    expirations: () =>
      [
        ...new Set(
          [7, 14, 21, 30, 60]
            .map((d) => visible(r).at(-1).time + d * 86400000)
            .concat(r.positions.map((p) => p.expiry)),
        ),
      ].sort((a, b) => a - b),
    strikes: () =>
      Array.from({ length: 21 }, (_, i) =>
        Math.max(
          0.01,
          Math.round(visible(r).at(-1).close / 2) * 2 + (i - 10) * 2,
        ),
      ),
    quote: (ticker, type, strike, expiry) =>
      modelQuote(
        type,
        visible(r).at(-1).close,
        strike,
        expiry,
        visible(r).at(-1).time,
        visible(r).at(-1).iv * (r.settings.iv / 0.3),
        r.settings,
      ),
    positions: (c) => replayLots(r, c),
    onSelect: () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    check: (o) => checkReplayOrder(r, o),
    submit: (o) => submitReplayOrder(r, o),
    handoff: (action) => {
      p();
      ctx.state.settings.openContractTool = action;
      save();
      location.hash = action === "lab" ? "#Options%20Lab" : "#Strategies";
    },
  });
  bindCrosshair(shown, (pt) => {
    $("#drawPrice").value = pt.price.toFixed(2);
    $("#drawTime").value = new Date(pt.bar.time).toISOString();
  });
  const redraw = () => replay();
  $("#replayFrame").onchange = () => {
    view.timeframe = n("replayFrame");
    view.pan = 0;
    redraw();
  };
  $("#advanceReplay").onclick = safe(() => {
    advance(r, number(n("replaySteps"), 1, 104));
    view.pan = 0;
    save();
    redraw();
  });
  for (const [id, key] of [
    ["replaySpeed", "speed"],
    ["replaySteps", "steps"],
  ])
    $("#" + id).oninput = $("#" + id).onchange = () => {
      view[key] = n(id);
      if (timer) {
        clearInterval(timer);
        timer = null;
        $("#playReplay").disabled = false;
      }
    };
  $("#playReplay").onclick = () => {
    if (timer) return;
    const seconds = n("replaySpeed"),
      steps = n("replaySteps");
    timer = setInterval(() => {
      try {
        if (!decodeURIComponent(location.hash).startsWith("#Market Replay")) {
          clearInterval(timer);
          timer = null;
          return;
        }
        if (r.cursor >= 1144) {
          clearInterval(timer);
          timer = null;
          $("#playReplay").disabled = false;
          ctx.toast("End of modeled scenario. Review or restart when ready.");
          return;
        }
        advance(r, steps);
        save();
        replayPlaying(seconds, steps);
      } catch (e) {
        clearInterval(timer);
        timer = null;
        ctx.toast(e.message);
      }
    }, seconds * 1000);
    $("#playReplay").disabled = true;
  };
  $("#pauseReplay").onclick = () => {
    clearInterval(timer);
    timer = null;
    $("#playReplay").disabled = false;
  };
  $("#restartReplay").onclick = safe(() => {
    const seed = number(n("replaySeed"), 0, 2147483647);
    if (!Number.isInteger(seed)) throw Error("Seed must be an integer");
    if (
      !confirm(
        "Restart the replay account? Completed trades are retained in its journal archive.",
      )
    )
      return;
    p().journal.push(...r.trades);
    p().replay = newReplay(seed, val("replayRegime"));
    save();
    redraw();
  });
  $("#randomReplay").onclick = () => {
    if (
      (r.positions.length || r.orders.length) &&
      !confirm(
        "Switch scenario and reset open replay positions/orders? Completed trades remain archived.",
      )
    )
      return;
    p().journal.push(...r.trades);
    p().replay = newReplay(
      crypto.getRandomValues(new Uint32Array(1))[0] % 2147483647,
      regimes[Math.floor(Math.random() * regimes.length)],
    );
    save();
    redraw();
  };
  $("#zoomIn").onclick = () => {
    view.window = Math.max(15, view.window - 15);
    redraw();
  };
  $("#zoomOut").onclick = () => {
    view.window = Math.min(200, view.window + 15);
    redraw();
  };
  $("#panBack").onclick = () => {
    view.pan = Math.min(all.length - 1, view.pan + 15);
    redraw();
  };
  $("#panNow").onclick = () => {
    view.pan = 0;
    redraw();
  };
  $$("[data-indicator]").forEach(
    (e) =>
      (e.onchange = () => {
        view.lines = $$("[data-indicator]:checked").map(
          (e) => e.dataset.indicator,
        );
        redraw();
      }),
  );
  $("#addDrawing").onclick = safe(() => {
    const drawing = {
      type: val("drawType"),
      price: number(n("drawPrice"), 0.01, 1e7),
      price2: number(n("drawPrice2"), 0.01, 1e7),
      time1: Date.parse(val("drawTime")),
      time2: Date.parse(val("drawTime2")),
    };
    if (!Number.isFinite(drawing.time1) || !Number.isFinite(drawing.time2))
      throw Error("Invalid drawing timestamp");
    r.drawings.push(drawing);
    save();
    redraw();
  });
  $("#clearDrawings").onclick = () => {
    r.drawings = [];
    save();
    redraw();
  };
  const order = () => ({
    type: val("orderType"),
    strike: n("orderStrike"),
    expiry: b.time + number(n("orderDte"), 0.01, 365) * 86400000,
    qty: n("orderQty"),
    riskPercent: n("orderRisk"),
    stop: n("orderStop"),
    target: n("orderTarget"),
    limit: n("orderLimit"),
    strategy: val("orderStrategy"),
    pattern: val("orderPattern"),
    reason: val("orderReason"),
  });
  const review = () => {
    try {
      const o = order(),
        q = modelQuote(
          o.type,
          b.close,
          o.strike,
          o.expiry,
          b.time,
          (b.iv || 0.3) * (r.settings.iv / 0.3),
          r.settings,
        ),
        fill = q.ask + r.settings.slippage;
      $("#orderReview").textContent =
        "Model bid / ask " +
        q.bid.toFixed(2) +
        " / " +
        q.ask.toFixed(2) +
        " · estimated full premium and entry fees " +
        usd(fill * o.qty * 100 + r.settings.commission * o.qty);
    } catch (e) {
      $("#orderReview").textContent = e.message;
    }
  };
  $$("#replayOrder input,#replayOrder select").forEach(
    (e) => (e.oninput = review),
  );
  review();
  $$("[data-contract]").forEach(
    (el) =>
      (el.onclick = () => {
        const q = quotes[Number(el.dataset.contract)];
        $("#orderType").value = q.type;
        $("#orderStrike").value = q.strike;
        $("#orderDte").value = 21;
        $("#orderStop").value = (q.ask * 0.7).toFixed(2);
        $("#orderTarget").value = (q.ask * 1.6).toFixed(2);
        review();
      }),
  );
  $("#sizeReplay").onclick = safe(() => {
    const o = order(),
      q = modelQuote(
        o.type,
        b.close,
        o.strike,
        o.expiry,
        b.time,
        b.iv,
        r.settings,
      ),
      size = positionSize(
        equity(r),
        n("orderRisk"),
        q.ask + r.settings.slippage,
        o.stop,
        r.settings.commission,
      );
    $("#orderQty").value = Math.min(size.quantity, r.settings.liquidity);
    $("#replaySize").textContent =
      "Whole contracts " +
      size.quantity +
      " · planned/contract " +
      usd(size.plannedPerContract) +
      " · full premium/contract " +
      usd(size.maxPerContract);
    review();
  });
  $("#replayOrder").onsubmit = (e) => {
    e.preventDefault();
    safe(() => {
      const o = order();
      val("orderKind") === "Limit" ? queueOrder(r, o) : enter(r, o);
      save();
      redraw();
    })();
  };
  $$("[data-exit]").forEach(
    (e) =>
      (e.onclick = safe(() => {
        exit(r, e.dataset.exit);
        save();
        redraw();
      })),
  );
  $$("[data-manage]").forEach(
    (e) =>
      (e.onclick = safe(() => {
        const t = r.positions.find((t) => t.id === e.dataset.manage);
        const stop = number(n("stop-" + t.id), 0, 1e6),
          target = number(n("target-" + t.id), stop + 0.01, 1e6);
        t.stop = stop;
        t.target = target;
        save();
        redraw();
      })),
  );
  $$("[data-cancel]").forEach(
    (e) =>
      (e.onclick = () => {
        r.orders = r.orders.filter((o) => o.id !== e.dataset.cancel);
        save();
        redraw();
      }),
  );
  $("#saveReplayCosts").onclick = safe(() => {
    const next = {};
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
    ])
      next[k] = number(n("setting-" + k), min, max, k);
    if (
      !Number.isInteger(next.liquidity) ||
      !Number.isInteger(next.maxPositions)
    )
      throw Error("Position and fill limits must be whole numbers");
    if (
      r.positions.reduce((sum, p) => sum + p.qty * next.commission, 0) > r.cash
    )
      throw Error("Available cash must cover reserved exit fees");
    r.settings = next;
    save();
    redraw();
  });
}
function replayPlaying(seconds, steps) {
  const held = timer;
  replay();
  timer = held;
  if ($("#playReplay")) $("#playReplay").disabled = true;
}
function lab() {
  const selected = ctx.state.settings.contractContext;
  if (selected && ctx.state.settings.openContractTool === "lab") {
    view.lab = {
      spot: selected.spot,
      strike: selected.strike,
      type: selected.type,
      days: Math.floor((selected.expiry - selected.time) / 86400000),
      hours: ((selected.expiry - selected.time) / 36e5) % 24,
      iv: selected.iv,
      rate: selected.rate,
      dividend: selected.dividend,
      qty: 1,
      premium: selected.premium,
    };
    delete ctx.state.settings.openContractTool;
    save();
  }
  const v = view.lab || {
    spot: 100,
    strike: 100,
    days: 21,
    hours: 0,
    iv: 0.3,
    rate: 0.04,
    dividend: 0,
    qty: 1,
    premium: 3,
    type: "call",
  };
  page(
    "Options Pricing Lab",
    "Theoretical European values, not executable American-style equity-option quotes. Change one assumption at a time.",
    `<section class="card"><div class="fields">${select("labPreset", "Educational preset", ["Custom", "IV crush", "Accelerating theta", "ITM vs OTM", "Right direction, losing option", "Short vs long DTE"], "Custom")}${select("lab-type", "Call or put", ["call", "put"], v.type)}${Object.entries(
      v,
    )
      .filter(([k]) => k !== "type")
      .map(([k, x]) =>
        field(
          "lab-" + k,
          {
            spot: "Underlying USD",
            strike: "Strike USD",
            days: "Calendar days",
            hours: "Additional hours",
            iv: "IV (decimal)",
            rate: "Risk-free rate",
            dividend: "Dividend yield",
            qty: "Contracts",
            premium: "Initial premium / share",
          }[k],
          x,
        ),
      )
      .join(
        "",
      )}</div><p>Greeks: delta per $1, gamma per $1², theta per calendar day, vega per 1 IV percentage point.</p></section><div id="labOutput" class="section-gap"></div>`,
  );
  const calc = () => {
    try {
      const a = Object.fromEntries(
        Object.keys(v)
          .filter((k) => k !== "type")
          .map((k) => [k, n("lab-" + k)]),
      );
      for (const [k, min, max] of [
        ["spot", 0.01, 1e6],
        ["strike", 0.01, 1e6],
        ["days", 0, 3650],
        ["hours", 0, 23.99],
        ["iv", 0, 5],
        ["rate", -0.1, 1],
        ["dividend", 0, 1],
        ["qty", 1, 100],
        ["premium", 0.001, 1e6],
      ])
        number(a[k], min, max, k);
      if (!Number.isInteger(a.qty)) throw Error("Whole contracts required");
      a.type = val("lab-type");
      view.lab = a;
      const days = a.days + a.hours / 24,
        q = modelQuote(a.type, a.spot, a.strike, days * 86400000, 0, a.iv, {
          ...defaults,
          rate: a.rate,
          dividend: a.dividend,
        }),
        pnl = (q.mid - a.premium) * 100 * a.qty,
        pr = (s) => price(a.type, s, a.strike, days, a.iv, a.rate, a.dividend),
        xs = Array.from(
          { length: 61 },
          (_, i) => a.spot * (0.65 + (i * 0.7) / 60),
        );
      $("#labOutput").innerHTML = `<div class="grid stats">${[
        ["Theoretical / share", usd(q.mid)],
        ["Delta", q.delta.toFixed(4)],
        ["Gamma", q.gamma.toFixed(4)],
        ["Theta / day", usd(q.theta)],
        ["Vega / IV point", usd(q.vega)],
        ["Intrinsic", usd(q.intrinsic)],
        ["Extrinsic", usd(q.extrinsic)],
        ["Maximum premium loss", usd(a.premium * 100 * a.qty)],
        [
          "Expiration break-even",
          usd(a.type === "call" ? a.strike + a.premium : a.strike - a.premium),
        ],
        ["Theoretical P/L", usd(pnl)],
        ["Return", pct(pnl / (a.premium * 100 * a.qty))],
      ]
        .map(
          ([k, x]) =>
            `<div class="card"><small>${k}</small><h3>${x}</h3></div>`,
        )
        .join("")}</div><section class="card"><h2>Expiration P/L</h2>${plot(
        xs.map(
          (s) => (intrinsic(a.type, s, a.strike) - a.premium) * 100 * a.qty,
        ),
        "Stock USD " +
          xs[0].toFixed(2) +
          " to " +
          xs.at(-1).toFixed(2) +
          " · P/L USD",
      )}<h2>Option value versus underlying</h2>${plot(xs.map(pr), "Stock low to high · option USD/share")}<h2>Theta decay</h2>${plot(
        Array.from({ length: 41 }, (_, i) =>
          price(
            a.type,
            a.spot,
            a.strike,
            days * (1 - i / 40),
            a.iv,
            a.rate,
            a.dividend,
          ),
        ),
        "Time remaining decreases left to right · USD/share",
      )}<h2>IV sensitivity</h2>${plot(
        Array.from({ length: 41 }, (_, i) =>
          price(
            a.type,
            a.spot,
            a.strike,
            days,
            0.05 + i * 0.025,
            a.rate,
            a.dividend,
          ),
        ),
        "IV 5% to 105% · USD/share",
      )}<h2>Delta and gamma behavior</h2>${plot(
        xs.map(
          (s) =>
            modelQuote(a.type, s, a.strike, days * 86400000, 0, a.iv, {
              ...defaults,
              rate: a.rate,
              dividend: a.dividend,
            }).delta,
        ),
        "Delta across stock prices",
      )}${plot(
        xs.map(
          (s) =>
            modelQuote(a.type, s, a.strike, days * 86400000, 0, a.iv, {
              ...defaults,
              rate: a.rate,
              dividend: a.dividend,
            }).gamma,
        ),
        "Gamma across stock prices",
      )}</section>`;
    } catch (e) {
      $("#labOutput").textContent = e.message;
    }
  };
  $$(".pm2 input,.pm2 select")
    .filter((e) => e.id !== "labPreset")
    .forEach((e) => (e.oninput = calc));
  $("#labPreset").onchange = () => {
    const preset = val("labPreset"),
      a = { ...v };
    if (preset === "IV crush") {
      a.iv = 0.2;
      a.premium = price(a.type, 100, 100, 21, 0.8);
    }
    if (preset === "Accelerating theta") {
      a.days = 2;
      a.premium = price(a.type, 100, 100, 21, 0.3);
    }
    if (preset === "ITM vs OTM") {
      a.spot = 110;
      a.strike = 100;
    }
    if (preset === "Right direction, losing option") {
      a.spot = 102;
      a.days = 3;
      a.iv = 0.2;
      a.premium = price("call", 100, 100, 21, 0.65);
    }
    if (preset === "Short vs long DTE") {
      a.days = 60;
      a.premium = price(a.type, 100, 100, 2, 0.3);
    }
    for (const [k, x] of Object.entries(a)) $("#lab-" + k).value = x;
    calc();
  };
  calc();
}
function strategiesPage() {
  const id = decodeURIComponent(location.hash).split("/")[1],
    saved = p().strategies.find((s) => s.id === id),
    s = structuredClone(saved || strategy());
  if (!saved && ctx.state.settings.openContractTool === "strategy") {
    const c = ctx.state.settings.contractContext;
    if (c) {
      s.direction = c.type === "call" ? "bullish" : "bearish";
      s.watchlist = c.ticker;
      s.name = c.ticker + " " + c.type + " study";
      s.notes +=
        " Selected strike " + c.strike + "; no profitable strategy is implied.";
    }
    delete ctx.state.settings.openContractTool;
    save();
  }
  page(
    "Strategy Builder",
    "Objective rule configurations. Experimental educational defaults; no validated profitability. Free-text thesis fields document intent and never execute code.",
    `<div class="grid cols"><section class="card"><h2>Saved strategies</h2>${
      p()
        .strategies.map(
          (s) =>
            `<p><a href="#Strategies/${esc(s.id)}">${esc(s.name)}</a> <button data-duplicate="${esc(s.id)}">Duplicate</button></p>`,
        )
        .join("") || "<p>No saved strategies yet.</p>"
    }<a href="#Strategies">New strategy</a></section><section class="card"><form id="strategyForm">${select("strategyTemplate", "Template", templates, s.template)}<div class="fields">${field("strategy-name", "Name", s.name, "text")}${field("strategy-watchlist", "Study watchlist labels", s.watchlist, "text")}${select("strategy-direction", "Direction", ["bullish", "bearish"], s.direction)}${select("strategy-entryRule", "Executable trigger", ["breakout", "pullback", "reversal", "false-breakout"], s.entryRule)}${select("strategy-primary", "Primary timeframe", ["1 hour"], s.primary)}${select("strategy-confirmation", "Completed confirmation", ["Daily"], s.confirmation)}${select("strategy-execution", "Base data interval", ["15 minutes"], s.execution)}${field("strategy-patternCriteria", "Pattern thesis (notes)", s.patternCriteria, "text")}${select("strategy-trend", "EMA9/20 hourly + completed daily trend filter", ["true", "false"], String(s.trend))}${select("strategy-overnight", "Allow overnight holds", ["true", "false"], String(s.overnight))}${Object.entries(
      s,
    )
      .filter(([k, v]) => typeof v === "number")
      .map(([k, v]) => field("strategy-" + k, parameterLabels[k] || k, v))
      .join(
        "",
      )}</div><p>Trigger: compare prior 8 completed hourly bars; breakout closes outside range; pullback touches EMA9 and closes back with trend; reversal crosses EMA9; false breakout wicks outside and closes inside. Volume is current / prior 8-bar average. Entries use next open; exits use premium stop percentage, target R, maximum hourly buckets or session end. Watchlist and pattern thesis are labels only. The concurrent-position setting caps modeled open positions. Daily loss gates new entries and reserves remaining planned risk; gaps may still exceed that budget.</p><button class="primary">Save strategy</button><a href="#Backtesting">Evaluate saved rules</a></form></section></div>`,
  );
  $("#strategyTemplate").onchange = () => {
    const next = strategy(val("strategyTemplate"));
    next.id = s.id;
    Object.assign(s, next);
    for (const [k, v] of Object.entries(s)) {
      const el = $("#strategy-" + k);
      if (el) el.value = String(v);
    }
  };
  $("#strategyForm").onsubmit = (e) => {
    e.preventDefault();
    safe(() => {
      for (const [k, v] of Object.entries(s)) {
        const el = $("#strategy-" + k);
        if (el)
          s[k] =
            typeof v === "boolean"
              ? el.value === "true"
              : typeof v === "number"
                ? Number(el.value)
                : el.value;
      }
      s.closeConfirmation = true;
      s.id = s.id || crypto.randomUUID();
      validateStrategy(s);
      const i = p().strategies.findIndex((x) => x.id === s.id);
      i < 0 ? p().strategies.push(s) : p().strategies.splice(i, 1, s);
      save();
      ctx.toast("Strategy saved");
      location.hash = "#Strategies/" + s.id;
    })();
  };
  $$("[data-duplicate]").forEach(
    (e) =>
      (e.onclick = () => {
        const copy = structuredClone(
          p().strategies.find((s) => s.id === e.dataset.duplicate),
        );
        copy.id = crypto.randomUUID();
        copy.name = copy.name + " copy";
        p().strategies.push(copy);
        save();
        location.hash = "#Strategies/" + copy.id;
      }),
  );
}
function testingPage() {
  const runs = p().runs,
    selected = runs.at(-1);
  page(
    "Backtesting",
    "Synthetic scenario testing and imported underlying data are separate. No historical option prices are fabricated. Freeze rules before chronological out-of-sample evaluation.",
    `<section class="card"><form id="backtestForm"><div class="fields">${select(
      "testStrategy",
      "Saved strategy",
      p().strategies.map((s) => ({ value: s.id, label: s.name })),
      p().strategies[0]?.id,
    )}${select("testDataset", "Dataset", ["Synthetic seeded DEMO", ...p().datasets.map((d) => d.name)], "Synthetic seeded DEMO")}${select("testRegime", "Synthetic regime", regimes, "Mixed")}${field("testSeed", "Seed", 41)}${field("testCapital", "Initial capital", 10000)}${select("testSegment", "Chronological segment", ["Full sample", "Training first 70%", "Out-of-sample last 30%"], "Full sample")}${field("testCommission", "Commission per contract / side", 0.65)}${field("testSlip", "Slippage dollars/share/side", 0.01)}${field("testSpread", "Full proportional spread", 0.05)}</div><p>${
      p()
        .strategies.map((s) => esc(s.name))
        .join(", ") || "Save a strategy before running a test."
    }</p><button class="primary" ${p().strategies.length ? "" : "disabled"}>Run frozen rules</button></form><p id="backtestStatus" role="status"></p><details><summary>Import permitted OHLCV or actual-quote dataset</summary><label>CSV or JSON<input id="datasetImport" type="file" accept=".csv,.json"></label><p>CSV: time (ISO UTC),open,high,low,close,volume. JSON: {name,kind:"underlying-only",bars:[...]}. Timestamps strictly increasing; base intervals must be 15 minutes within sessions. Actual option quote schema is documented in README; actual-quote execution remains unsupported and is rejected, never silently modeled.</p><button id="datasetExample">Download import example</button></details></section><div id="backtestResult" class="section-gap">${selected ? resultHTML(selected) : '<div class="card empty">No runs yet. Empty metrics are not invented performance.</div>'}</div><section class="card section-gap"><h2>Compare saved configurations</h2><div class="table-wrap"><table><thead><tr><th>Dataset / source</th><th>Strategy</th><th>Segment</th><th>Trades</th><th>Net</th><th>Max DD</th></tr></thead><tbody>${runs.map((r) => `<tr><td>${esc(r.dataset)} · ${esc(r.kind)}</td><td>${esc(r.strategy.name)}</td><td>${r.from}–${r.to}</td><td>${r.metrics.count}</td><td>${usd(r.metrics.net)}</td><td>${pct(r.metrics.maxDrawdown)}</td></tr>`).join("")}</tbody></table></div><button id="exportRuns">Export run archive JSON</button></section>`,
  );
  $("#backtestForm").onsubmit = (e) => {
    e.preventDefault();
    safe(() => {
      const st = p().strategies.find((s) => s.id === val("testStrategy"));
      if (!st) throw Error("Select a saved strategy");
      const imported = p().datasets.find((d) => d.name === val("testDataset")),
        data = imported || {
          name:
            "Synthetic DEMO seed " + n("testSeed") + " " + val("testRegime"),
          kind: "synthetic",
          bars: scenario(
            number(n("testSeed"), 0, 2147483647),
            val("testRegime"),
          ),
        },
        segment = val("testSegment"),
        result = backtest(data, st, {
          capital: number(n("testCapital"), 100, 1e8),
          start: segment === "Out-of-sample last 30%" ? 0.7 : 0,
          end: segment === "Training first 70%" ? 0.7 : 1,
          costs: {
            ...defaults,
            commission: number(n("testCommission"), 0, 100),
            slippage: number(n("testSlip"), 0, 100),
            spread: number(n("testSpread"), 0, 0.5),
          },
        });
      p().runs.push(result);
      p().runs = p().runs.slice(-20);
      save();
      testingPage();
    })();
  };
  $("#datasetImport").onchange = async (e) => {
    try {
      const f = e.target.files[0];
      if (!f || f.size > 8e6) throw Error("Choose a dataset under 8 MB");
      const d = importDataset(await f.text(), f.name);
      p().datasets.push(d);
      save();
      testingPage();
    } catch (err) {
      ctx.toast(err.message);
    }
  };
  $("#datasetExample").onclick = () =>
    download(
      "underlying-example.json",
      JSON.stringify(
        {
          name: "EXAMPLE synthetic base bars",
          kind: "synthetic",
          bars: scenario(1).slice(0, 104),
        },
        null,
        2,
      ),
    );
  $("#exportRuns").onclick = () =>
    download("papermoney-runs.json", JSON.stringify(runs, null, 2));
  if ($("#exportTradeCSV"))
    $("#exportTradeCSV").onclick = () =>
      download("backtest-trades.csv", csv(selected.trades), "text/csv");
}
function resultHTML(r) {
  return `<section class="card"><h2>${esc(r.dataset)} · ${esc(r.strategy.name)}</h2><p>${esc(r.assumptions)}</p><p class="notice">${r.trades.length < 30 ? "Small sample: fewer than 30 trades. " : ""}Repeated tuning and synthetic regimes do not establish real-market profitability. Sharpe ratio omitted: event-based option trades are not a suitable periodic return series.</p>${metricsHTML(r.metrics)}${plot(r.metrics.equity, "Closed-trade equity USD (not intratrade equity)")}${plot(r.metrics.drawdowns, "Closed-trade drawdown %")}<button id="exportTradeCSV">Export all trades CSV</button><details><summary>All simulated trades (${r.trades.length})</summary><div class="table-wrap"><table><thead><tr><th>Entry UTC</th><th>Type</th><th>Strike</th><th>Qty</th><th>Entry</th><th>Exit</th><th>Net P/L</th><th>Exit reason</th></tr></thead><tbody>${r.trades.map((t) => `<tr><td>${new Date(t.entryTime).toISOString()}</td><td>${t.type}</td><td>${t.strike}</td><td>${t.qty}</td><td>${t.entry.toFixed(2)}</td><td>${t.exit.toFixed(2)}</td><td>${usd(t.pnl)}</td><td>${esc(t.exitReason)}</td></tr>`).join("")}</tbody></table></div></details></section>`;
}
function journal() {
  const replayTrades = [...p().journal, ...p().replay.trades],
    legacy = ctx.state.journal.map((j) => ({
      ...j,
      source: "practice-" + j.mode,
      strategy:
        j.details?.source === "broker-chain"
          ? "Chain practice"
          : "Legacy practice",
      type: j.details?.type,
      strike: j.details?.strike,
      qty: j.details?.quantity,
      pnl: j.details?.realizedPnl,
      entryTime: Date.parse(j.created),
      notes: j.reflection,
      reason: j.reason,
    })),
    all = [...replayTrades, ...legacy];
  page(
    "Trading Journal",
    "Replay fills populate contract details, Greeks, risk, timestamps, fees, excursions and chart seed automatically. Existing practice reflections remain available.",
    `<a href="#Journal">Original practice journal editor</a><div class="card section-gap"><div class="fields">${field("journalSearch", "Search rationale, notes, pattern or strategy", "", "search")}${select("journalSource", "Source", ["All", "Replay", "Practice"], "All")}${select("journalStrategy", "Strategy", ["All", ...new Set(all.map((t) => t.strategy || "Not recorded"))], "All")}${select("journalPattern", "Pattern", ["All", ...new Set(all.map((t) => t.pattern || "Not recorded"))], "All")}${select("journalSort", "Sort", ["Newest", "Oldest", "Highest P/L", "Lowest P/L"], "Newest")}</div><button id="journalCSV">Export filtered CSV</button><button id="journalJSON">Export filtered JSON</button></div><div id="journalResults" class="grid lesson-grid section-gap"></div>`,
  );
  let filtered = [];
  const render = () => {
    filtered = all
      .filter(
        (t) =>
          (t.reason + " " + t.notes + " " + t.strategy + " " + t.pattern)
            .toLowerCase()
            .includes(val("journalSearch").toLowerCase()) &&
          (val("journalSource") === "All" ||
            (val("journalSource") === "Replay") ===
              t.source?.startsWith("synthetic")) &&
          (val("journalStrategy") === "All" ||
            val("journalStrategy") === (t.strategy || "Not recorded")) &&
          (val("journalPattern") === "All" ||
            val("journalPattern") === (t.pattern || "Not recorded")),
      )
      .sort((a, b) =>
        val("journalSort") === "Highest P/L"
          ? (b.pnl || 0) - (a.pnl || 0)
          : val("journalSort") === "Lowest P/L"
            ? (a.pnl || 0) - (b.pnl || 0)
            : val("journalSort") === "Oldest"
              ? (a.entryTime || Date.parse(a.created)) -
                (b.entryTime || Date.parse(b.created))
              : (b.entryTime || Date.parse(b.created)) -
                (a.entryTime || Date.parse(a.created)),
      );
    $("#journalResults").innerHTML =
      filtered
        .map(
          (t) =>
            `<article class="card"><small>${esc(t.source)} · ${esc(t.id)}</small><h2>${esc(t.strategy || "Practice reflection")}</h2><p>${t.pnl === undefined ? "Open / reflection" : usd(t.pnl)} · ${esc(t.pattern || "No pattern recorded")} · ${esc(t.type || "")} ${t.qty || ""} × ${t.strike || ""}</p><p>${esc(t.reason || "No entry rationale recorded")}</p><details><summary>Complete trade record</summary><pre>${esc(JSON.stringify(t, null, 2))}</pre></details>${t.source?.startsWith("synthetic") ? `<button data-edit-trade="${esc(t.id)}">Edit process review</button>` : '<a href="#Journal">Edit original reflection</a>'}</article>`,
        )
        .join("") ||
      '<div class="card empty">No trades match. Replay fills create records automatically; no sample profits are inserted.</div>';
    $$("[data-edit-trade]").forEach(
      (b) =>
        (b.onclick = () => {
          const t = replayTrades.find((x) => x.id === b.dataset.editTrade);
          ctx.modal(
            `<h2>Process review</h2><p>Assess rule adherence independently of P/L.</p>${field("tradeAdherence", "Rule adherence % (0–100)", t.adherence === null ? "" : t.adherence * 100)}${["notes", "mistakes", "lessons", "emotion", "higherTrend", "marketCondition", "exitReason"].map((k) => `<label>${k}<textarea id="trade-${k}" maxlength="5000">${esc(t[k] || "")}</textarea></label>`).join("")}<button id="saveTradeReview">Save review</button>`,
          );
          $("#saveTradeReview").onclick = safe(() => {
            t.adherence =
              val("tradeAdherence") === ""
                ? null
                : number(n("tradeAdherence"), 0, 100) / 100;
            for (const k of [
              "notes",
              "mistakes",
              "lessons",
              "emotion",
              "higherTrend",
              "marketCondition",
              "exitReason",
            ])
              t[k] = val("trade-" + k);
            save();
            $("#dialog").close();
            render();
          });
        }),
    );
  };
  $$(".pm2 input,.pm2 select").forEach((e) => (e.oninput = render));
  $("#journalCSV").onclick = () =>
    download("journal.csv", csv(filtered), "text/csv");
  $("#journalJSON").onclick = () =>
    download("journal.json", JSON.stringify(filtered, null, 2));
  render();
}
export function platformDashboard(context) {
  ctx = context;
  ctx.state.platform ??= freshPlatform();
  const pp = p(),
    trades = [...pp.journal, ...pp.replay.trades],
    m = analytics(trades, pp.replay.initial),
    groups = [
      "strategy",
      "pattern",
      "timeframe",
      "ticker",
      "type",
      "marketCondition",
    ],
    attempts = pp.advancedAttempts,
    weak = categories
      .map((c) => {
        const a = attempts.filter((a) => a.category === c);
        return {
          c,
          count: a.length,
          rate: a.length ? a.filter((a) => a.correct).length / a.length : null,
        };
      })
      .sort((a, b) => (a.rate ?? -1) - (b.rate ?? -1)),
    next = hourlyLessons.find((l) => !pp.hourlyCompleted.includes(l.id));
  return `<section class="card section-gap"><h2>Hourly development and replay</h2><p>${pp.hourlyCompleted.length} / 15 hourly modules · ${attempts.length} advanced decisions · ${trades.length} closed replay trades. Separate from Practice Trading, backtests and quiz accuracy.</p><a href="#Guided%20Lessons/hourly/${next?.id || ""}">${next ? "Next lesson: " + esc(next.title) : "Revisit masterclass"}</a> · <a href="#Challenges/hourly">Recommended practice: ${esc(weak[0].c)}</a> · <a href="#Development">Milestones</a>${metricsHTML(m)}${m.count ? plot(m.equity, "Replay closed-trade equity") : ""}<details><summary>Educational accuracy by skill</summary>${weak.map((x) => `<p>${x.c}: ${x.rate === null ? "No attempts" : pct(x.rate)} (${x.count})</p>`).join("")}</details><details><summary>Replay performance breakdowns</summary>${groups
    .map(
      (k) =>
        `<h3>By ${k}</h3>${
          [...new Set(trades.map((t) => t[k] || "Not recorded"))]
            .map((v) => {
              const g = analytics(
                trades.filter((t) => (t[k] || "Not recorded") === v),
              );
              return `<p>${esc(v)} · ${g.count} trades · ${usd(g.net)} · expectancy ${usd(g.expectancy)}</p>`;
            })
            .join("") || "<p>No trades yet.</p>"
        }`,
    )
    .join("")}<h3>By DTE</h3>${["0–7", "8–30", "31+"]
    .map((label, i) => {
      const group = trades.filter((t) => {
        const d = (t.expiry - t.entryTime) / 86400000;
        return i === 0 ? d <= 7 : i === 1 ? d > 7 && d <= 30 : d > 30;
      });
      return `<p>${label}: ${group.length} trades · ${usd(analytics(group).net)}</p>`;
    })
    .join("")}</details></section>`;
}
function development() {
  const pp = p(),
    a = pp.advancedAttempts,
    trades = [...pp.journal, ...pp.replay.trades],
    reviewed = trades.filter((t) => t.adherence !== null),
    adherence = reviewed.length
      ? reviewed.reduce((n, t) => n + t.adherence, 0) / reviewed.length
      : 0,
    accuracy = (c) => {
      const x = a.filter((t) => t.category === c);
      return (
        x.length >= pp.milestones.attempts &&
        x.filter((t) => t.correct).length / x.length >= pp.milestones.accuracy
      );
    },
    levels = [
      ["Foundations", pp.hourlyCompleted.length >= pp.milestones.lessons],
      ["Chart Analyst", accuracy(categories[0])],
      ["Options Analyst", accuracy(categories[2])],
      ["Risk Manager", accuracy(categories[3])],
      ["Simulated Trader", trades.length >= pp.milestones.replayTrades],
      ["Strategy Developer", pp.strategies.length > 0 && pp.runs.length > 0],
      [
        "Independent Trader (simulation only)",
        reviewed.length >= pp.milestones.replayTrades &&
          adherence >= pp.milestones.adherence,
      ],
    ];
  page(
    "Trader Development",
    "Skill milestones reward documented practice and rule adherence. Completing them does not establish readiness for real-money trading.",
    `<div class="grid lesson-grid">${levels.map(([name, done], i) => `<article class="card"><small>Level ${i + 1} · ${done ? "Evidence recorded" : "In progress"}</small><h2>${name}</h2><progress max="1" value="${done ? 1 : 0}" aria-label="${name} milestone"></progress></article>`).join("")}</div><section class="card section-gap"><h2>Configure educational milestones</h2><form id="milestoneForm"><div class="fields">${Object.entries(
      pp.milestones,
    )
      .map(([k, v]) => field("milestone-" + k, parameterLabels[k] || k, v))
      .join(
        "",
      )}</div><button>Save milestones</button></form><p>Accuracy needs the configured attempt count within each category. Adherence is self-reviewed and distinct from profitability.</p><a href="#Challenges/hourly">Targeted practice</a></section>`,
  );
  $("#milestoneForm").onsubmit = (e) => {
    e.preventDefault();
    safe(() => {
      const next = {};
      for (const k of Object.keys(pp.milestones))
        next[k] = number(
          n("milestone-" + k),
          k === "accuracy" || k === "adherence" ? 0 : 1,
          k === "accuracy" || k === "adherence"
            ? 1
            : k === "lessons"
              ? 15
              : 1000,
        );
      pp.milestones = next;
      save();
      development();
    })();
  };
}
