import { patternTopics } from "./chart-content.js";
import { scenario, aggregate, seeded, modelQuote } from "./platform-engine.js";
const rows = [
  [
    "Market structure and trend identification",
    "Describe higher highs and higher lows before giving a market a bullish label.",
    "A trend is a sequence, not a single green candle. Compare completed hourly swing highs and lows. A close through the most recent defended low weakens an uptrend hypothesis. A range can remain a range after several strong candles.",
    "Price makes highs 100, 102, 103 and lows 97, 99, 101. Higher swing points support an uptrend reading; a later close at 98 would weaken it.",
    "Calling an option a trend trade because the last candle is green.",
    "The hourly trend and completed daily trend agree, then an entry trigger occurs.",
    "An apparent higher low fails before the trigger. Waiting preserves capital.",
    "Highest swing high minus latest swing low: 103 − 101. Enter the distance.",
    2,
    "Long calls express upside exposure, but time decay and IV can offset a stock rise.",
    "stocks-options",
  ],
  [
    "Hourly candlestick analysis",
    "Read OHLC, body and wicks without assuming an hourly bar contains 60 traded minutes at session end.",
    "Each completed candle summarizes a time interval. It cannot tell you whether its high occurred before its low. The final regular-session hourly bucket in our 6.5-hour session has only 30 minutes. Intrabar execution needs a conservative rule.",
    "O=100 H=104 L=99 C=103 has a 3-point body and 5-point range. A bullish body is evidence of that interval only.",
    "Assuming the stop and target order from one OHLC bar.",
    "A completed close confirms the predeclared level.",
    "The high crosses resistance but the close falls back below it.",
    "Enter the range: high 104 minus low 99.",
    5,
    "Use only a completed hourly bar for confirmation; an option fill belongs to a later executable quote.",
    "dt-07",
  ],
  [
    "Support and resistance",
    "Define zones and invalidate an idea instead of treating a price as a wall.",
    "Repeated reactions define areas where participants previously responded. Mark a zone with a tolerance and a specific close rule. A support zone can fail or switch roles. Larger timeframes provide context, not certainty.",
    "A ceiling at 102–102.30 needs a close above 102.30 under this rule. A close at 102.10 is not enough.",
    "Moving the zone after seeing the result.",
    "A close at 102.60 clears the upper boundary.",
    "A wick to 102.70 followed by a 101.90 close fails the stated rule.",
    "Distance from entry 102.60 to invalidation 101.80?",
    0.8,
    "Translate a stock invalidation into a monitored plan; an option premium stop has different exposure.",
    "dt-06",
  ],
  [
    "Bullish and bearish continuation patterns",
    "Separate an impulse, a pause and a trigger.",
    "Flags and flat boundaries are candidate structures. A modest pause after an impulse may continue or reverse. Predeclare the boundary, the close confirmation and the maximum extension you will accept. Do not make minute-chart scanner rules into hourly rules without testing.",
    "An advance 98 to 104 pauses between 102.50 and 103.50. A later completed close above 103.50 is a trigger, not a guarantee.",
    "Buying a call before confirmation solely because a flag appears.",
    "Volume expands on a completed close out of the pause.",
    "The pause deepens below the impulse origin.",
    "Impulse distance from 98 to 104?",
    6,
    "Check spread, DTE and premium at risk after the stock trigger, before entering.",
    "dt-09",
  ],
  [
    "Reversal patterns",
    "Distinguish reversal candidates from confirmed changes in structure.",
    "A head-and-shoulders candidate needs three peaks and a reference neckline. The inverse uses troughs. A close through the neckline can be a specified confirmation. Many candidates fail; reversal against a daily trend needs extra caution.",
    "Peaks 104, 107, 105 above a 101 neckline form a candidate. A close at 102 has not broken the neckline.",
    "Naming the pattern from two peaks or predicting a mandatory measured target.",
    "A close below 101 then a failed reclaim fits a bearish rule.",
    "A reclaim above the right shoulder invalidates the intended short thesis.",
    "Head 107 minus neckline 101?",
    6,
    "A long put limits contractual loss to premium and fees, but a good stock direction does not guarantee option profit.",
    "dt-08",
  ],
  [
    "False breakouts and confirmation",
    "Recognize rejection and use wait/no-trade decisions.",
    "A false breakout is defined relative to a level and a return into the prior range. Define the time allowed for rejection. Calling every loss a trap after the fact invites hindsight. A non-entry can be the best adherence score.",
    "Resistance 105 is crossed intrabar, but the candle closes 104.60. A close-above-105 rule says wait.",
    "Changing a close-based rule into a wick-based rule to justify an entry.",
    "A later completed close clears the zone and respects risk limits.",
    "A rapid return into the old range invalidates the breakout.",
    "Distance between 105 and close 104.60?",
    0.4,
    "Do not use a cheap out-of-the-money contract to compensate for an absent trigger.",
    "dt-05",
  ],
  [
    "EMA, SMA, volume and volatility",
    "Explain indicator lag, warm-up and session resets.",
    "EMA weights recent observations more heavily; SMA uses equal weights. Neither predicts the next candle. RSI and ATR need warm-up. VWAP resets each session and a 30-minute closing bucket is not comparable in volume to a full hour. Relative volume needs comparable intervals.",
    "A 50 SMA cannot be displayed from 20 hourly observations. Our interface leaves it unavailable rather than inventing history.",
    "Using a full-session VWAP on a partial replay or treating a moving average as a guaranteed floor.",
    "Enough prior bars support the displayed indicator.",
    "Insufficient history or mixed sessions make the indicator unavailable or misleading.",
    "How many more bars does a 50 SMA need after 20?",
    30,
    "High underlying volatility often raises premiums; distinguish realized ATR from implied volatility.",
    "dt-03",
  ],
  [
    "Multi-timeframe analysis",
    "Use consistent base data and completed higher-timeframe bars.",
    "Daily, four-hour and hourly views aggregate the same 15-minute base bars. A developing daily bar is not a completed daily confirmation. Align an hourly hypothesis with already completed daily context; use 15-minute detail only if the dataset supports it.",
    "At midday Monday, Friday is the latest completed daily bar. Monday’s partial daily candle is observation, not Friday-style confirmation.",
    "Combining independently generated charts as if they described one market.",
    "The completed daily trend supports the hourly direction.",
    "The hourly breakout points into an unresolved daily resistance zone.",
    "How many complete 15-minute bars make a full hour?",
    4,
    "Execution refinement cannot remove overnight gap risk from a swing option.",
    "dt-07",
  ],
  [
    "Options contract selection",
    "Select a contract against an explicit objective and cost constraint.",
    "Calls have positive directional delta and puts negative. Compare absolute delta, DTE, spread, IV and affordability together. A small premium may hide low delta or a wide percentage spread. Our 14–30 DTE and 0.50–0.70 absolute delta band are experimental study settings, not advice.",
    "Contract A ask 3.20, bid 3.10 costs $320 plus fees per 100-share contract. A $300 budget cannot afford it.",
    "Selecting the lowest premium without considering spread or time.",
    "A quoted contract meets the stated DTE, delta and budget rules.",
    "No available contract meets all constraints: no trade.",
    "One contract at 3.20 per share costs how many dollars before fees?",
    320,
    "Maximum long-option loss can be the full premium plus fees.",
    "stocks-options",
  ],
  [
    "Greeks and implied volatility",
    "Separate a directional move from an option-value change.",
    "Delta estimates local directional exposure. Gamma describes how delta changes; theta is time sensitivity and vega is IV sensitivity. These are local model estimates, not guaranteed P/L. IV can collapse after an event even when direction was correctly predicted.",
    "Delta .60 estimates roughly $60 per contract for a small $1 stock rise before gamma, theta and vega changes. Vega .08 per share per IV point implies about $80 loss for a 10-point IV decline.",
    "Adding Greeks linearly over large moves as if the approximation were exact.",
    "Direction, remaining time and IV combine favorably.",
    "A correct direction is outweighed by IV crush and spread.",
    "Estimated dollar delta for .60 × 100?",
    60,
    "Explore nonlinear effects in Options Lab. The European model does not reproduce American exercise.",
    "dt-04",
  ],
  [
    "Entry and exit strategies",
    "Specify a trigger, invalidation and exit before entering.",
    "A trading plan includes a condition for entry, a stock invalidation and a premium management rule. Wait when the trigger is absent. A stop is an instruction within a model; gap-through fills may be worse than its threshold.",
    "Buy ask 4.00, premium stop 2.80, target 6.40: planned premium risk 1.20 per share; reward 2.40. Full premium loss is still possible.",
    "Chasing after a trigger has moved beyond the planned risk budget.",
    "A defined next-bar entry has available capital and liquidity.",
    "The market gaps through the stop, increasing loss.",
    "Target reward 2.40 divided by planned risk 1.20?",
    2,
    "Replay uses bid exits, commissions and slippage; stop-first handling resolves ambiguous OHLC touches.",
    "dt-10",
  ],
  [
    "Risk management and position sizing",
    "Keep planned stop risk separate from full contractual loss.",
    "Size using both a planned-risk budget and an affordability ceiling. Correlated calls can share a common market driver even with different tickers. A daily loss limit should stop new entries, not rewrite prior losses.",
    "Equity $10,000, 1% budget, premium 2.00, stop 1.00: one contract risks $100 before costs but can lose $200. With fees the planned-risk quantity may become zero.",
    "Using maximum loss and planned loss interchangeably or rounding position size upward.",
    "The computed whole-contract quantity fits both budgets.",
    "The smallest contract exceeds the budget: choose no trade.",
    "1% of $10,000?",
    100,
    "Use whole 100-share contracts; maximum premium exposure matters across all open positions.",
    "dt-06",
  ],
  [
    "Backtesting and statistical expectancy",
    "Use chronological evaluation and count every eligible decision.",
    "Net expectancy is total net P/L divided by all completed trades. Profit factor compares gross gains with absolute gross losses. Small samples, repeated tuning and selected regimes cannot establish profitability. Separate model-priced options from actual quote history.",
    "Four trades net +100, −50, −50, +40 total +40. Expectancy is $10/trade, before any costs not already included.",
    "Using future closes for entries or labeling synthetic tests as historical evidence.",
    "A rule is frozen before an out-of-sample chronological segment.",
    "Performance disappears after costs or on unseen regimes.",
    "Net expectancy for +100, −50, −50, +40?",
    10,
    "Model IV assumptions may dominate option results. Underlying-only imports are explicitly model-priced.",
    "dt-10",
  ],
  [
    "Trading psychology and discipline",
    "Measure rule adherence independently from profitability.",
    "A valid plan can lose and an impulsive trade can win. Record the rule, the observation and whether you followed it. Reward a documented wait when a trigger or contract requirement is absent. Use mistakes to select the next practice exercise.",
    "A planned stop loses $80 exactly as modeled. Another unplanned trade wins $200. The first can deserve stronger process feedback.",
    "Increasing frequency to raise a completion score.",
    "A no-trade decision respects absent confirmation.",
    "Revenge entries exceed the daily loss limit.",
    "Three followed rules out of four: percent adherence?",
    75,
    "Neither a badge nor a winning simulation certifies readiness to risk real money.",
    "dt-05",
  ],
  [
    "Complete strategy development",
    "Translate an idea into testable, versioned rules.",
    "Specify timeframe, trend filter, trigger, contract band, cost assumptions and exit rules. Save a version before testing. Compare variants on the same chronological segment; reserve a later segment for evaluation. Free-text notes explain a thesis but are never executed as code.",
    "An hourly breakout rule uses prior eight completed bars, completed daily EMA context, next-open entry, 30% premium stop and 2R target. Change one parameter, duplicate the strategy, then compare.",
    "Optimizing many rules until one seed looks profitable and reporting it as evidence.",
    "The saved objective rules reproduce the same synthetic run.",
    "An attractive discretionary description has no executable definition.",
    "At risk $75 with a 2R target, planned reward before costs?",
    150,
    "The default watchlist is a study label. Synthetic DEMO prices do not represent those tickers.",
    "dt-10",
  ],
];
export const hourlyLessons = rows.map((r, i) => ({
  id: "hour-" + String(i + 1).padStart(2, "0"),
  title: r[0],
  objective: r[1],
  theory: r[2],
  example: r[3],
  mistake: r[4],
  success: r[5],
  failure: r[6],
  exercise: r[7],
  answer: r[8],
  application: r[9],
  prerequisite: r[10],
  difficulty: i < 5 ? "Beginner" : i < 11 ? "Intermediate" : "Advanced",
  source:
    "Original hourly options curriculum; general chart concepts referenced separately to the supplied ChartPatternsv2.pdf. Options mechanics: OIC / SEC.",
  checks: [
    {
      prompt: "Which statement follows the lesson?",
      options: [
        r[1],
        "This setup guarantees a profitable option.",
        "A winning simulation proves readiness for real-money trading.",
      ],
      correct: 0,
    },
    {
      prompt: "Which response respects uncertainty?",
      options: [
        "Raise risk after each loss.",
        "Use the stated invalidation and allow a no-trade decision.",
        "Ignore costs in a directional trade.",
      ],
      correct: 1,
    },
  ],
}));
const primary = [
  "bull-flag",
  "bear-flag",
  "flat-top",
  "flat-bottom",
  "ma-pullback",
  "abcd",
  "head-shoulders",
  "inverse",
  "bull-trap",
  "bear-trap",
  "trend-shift",
  "support",
  "resistance",
];
const specialized = [
  "gap-go",
  "micro",
  "whole-half",
  "one-minute",
  "five-minute",
  "ipo",
  "parabolic",
  "halt",
  "no-news-halt",
];
export const library = patternTopics.map((p, i) => ({
  ...p,
  bias:
    /bear|bottom|short|down|fade|head-and-shoulders/i.test(p.title) &&
    !/Inverted/i.test(p.title)
      ? "bearish"
      : /halt|headline|converg|premarket|whole/i.test(p.title)
        ? "neutral"
        : "bullish",
  category: primary.includes(p.id)
    ? "Hourly priority"
    : specialized.includes(p.id)
      ? "Specialized day trading"
      : "Intraday adaptation",
  type: /reversal|trap|head|shift/i.test(p.title)
    ? "Reversal"
    : "Continuation / context",
  difficulty: i < 12 ? "Beginner" : i < 26 ? "Intermediate" : "Advanced",
  lesson: hourlyLessons[i % 15].id,
}));
library.push(
  {
    ...library[3],
    id: "support",
    title: "Support zones",
    bias: "neutral",
    category: "Hourly priority",
    type: "Continuation / context",
    lesson: "hour-03",
    explanation:
      "Repeated defended lows suggest a support zone. A close beneath the zone can invalidate a holding-support thesis; support is not a guaranteed floor.",
  },
  {
    ...library[2],
    id: "resistance",
    title: "Resistance zones",
    bias: "neutral",
    category: "Hourly priority",
    type: "Continuation / context",
    lesson: "hour-03",
    explanation:
      "Repeated rejected highs suggest a resistance zone. A completed break can succeed or fail; define the zone and confirmation before observing the outcome.",
  },
);
for (const item of library) {
  if (item.id === "bull-trap") item.bias = "bearish";
  if (["bear-trap", "gap-down", "inverse"].includes(item.id))
    item.bias = "bullish";
  if (item.id === "trend-shift") item.bias = "neutral";
}
// Hourly-specific structures: multi-session impulse/consolidation, open gaps and interval-scale volatility.
export function patternFigure(
  index = 0,
  timeframe = "1 hour",
  outcome = false,
) {
  const rand = seeded(900 + index),
    item = library[index % library.length],
    id = item?.id || "bull-flag",
    up = item?.bias !== "bearish",
    sign = up ? 1 : -1;
  const anchors =
    id === "head-shoulders"
      ? [100, 103, 100.5, 106, 100.5, 102.8, 100.6]
      : id === "inverse"
        ? [105, 102, 104.5, 99, 104.5, 102.2, 104.4]
        : /flat-top|resistance/.test(id)
          ? [98, 102, 100, 102, 100.8, 102, 101.3]
          : /flat-bottom|support/.test(id)
            ? [104, 100, 102, 100, 101.2, 100, 100.7]
            : id === "abcd"
              ? [98, 104, 101.5, 103, 102, 104, 103.5]
              : /trap/.test(id)
                ? [100, 102, 100, 102, 103.5, 101, 100.5]
                : /head|halt|headline|no-news/.test(id)
                  ? [100, 102, 99, 101, 98, 101, 100]
                  : id === "trend-shift"
                    ? [105, 103, 101, 99, 100, 102, 104]
                    : /ma-/.test(id)
                      ? [98, 101, 103, 102, 101.5, 103, 105]
                      : /vwap-fade|gap-fade/.test(id)
                        ? [105, 106, 104, 103, 104, 102, 101]
                        : /trendlines|double-top/.test(id)
                          ? [100, 104, 100.5, 103.5, 101, 103, 101.5]
                          : [
                              100,
                              100 + sign * 2,
                              100 + sign * 4,
                              100 + sign * 6,
                              100 + sign * 5.2,
                              100 + sign * 4.8,
                              100 + sign * 5.1,
                            ];
  if (id === "parabolic")
    anchors.splice(0, 7, 100, 100.5, 101.5, 103, 106, 111, 118);
  if (id === "whole-half")
    anchors.splice(0, 7, 99, 99.5, 100, 99.5, 100, 100.5, 100);
  if (id === "ipo") anchors.splice(0, 7, 100, 106, 103, 108, 111, 107, 112);
  if (id === "opening-range")
    anchors.splice(0, 7, 100, 102, 99, 101, 100.8, 102.5, 103);
  const scale =
    timeframe === "1 minute"
      ? 0.08
      : timeframe === "5 minutes"
        ? 0.2
        : timeframe === "15 minutes"
          ? 0.4
          : timeframe === "4 hours"
            ? 1.8
            : timeframe === "Daily"
              ? 3
              : 1;
  let closes = Array.from({ length: 25 }, (_, i) => {
    const t = i / 4,
      k = Math.min(5, Math.floor(t)),
      a = anchors[k] + (anchors[k + 1] - anchors[k]) * (t - k);
    return 100 + (a - 100) * scale + (rand() - 0.5) * 0.12 * scale;
  });
  if (outcome) {
    const last = closes.at(-1),
      direction =
        outcome === "success"
          ? 0.8
          : outcome === "failure"
            ? -0.8
            : index % 3 === 0
              ? -0.8
              : 0.8;
    closes.push(
      ...[1, 2, 3, 4].map((i) => last + sign * direction * scale * i),
    );
  }
  let base;
  if (timeframe === "1 hour")
    base = aggregate(scenario(900 + index, "Mixed"), 60).slice(
      140,
      140 + closes.length,
    );
  else if (timeframe === "4 hours" || timeframe === "Daily")
    base = aggregate(
      scenario(900 + index, "Mixed", 70),
      timeframe === "Daily" ? 390 : 240,
    ).slice(20, 20 + closes.length);
  else {
    const minutes =
      timeframe === "1 minute" ? 1 : timeframe === "5 minutes" ? 5 : 15;
    base = closes.map((_, i) => ({
      time: Date.parse("2026-02-02T14:30:00Z") + (i + 1) * minutes * 60000,
      session: "2026-02-02",
    }));
  }
  const bars = closes.map((close, i) => {
    const open = i
        ? closes[i - 1] + (i % 7 === 0 ? (rand() - 0.5) * 0.6 * scale : 0)
        : close - 0.3 * scale,
      wiggle = (0.12 + rand() * 0.12) * scale;
    return {
      time: base[i].time,
      session: base[i].session,
      open,
      high: Math.max(open, close) + wiggle,
      low: Math.min(open, close) - wiggle,
      close,
      volume: Math.round((200000 + rand() * 400000) * scale),
    };
  });
  return { bars, cutoff: bars.length, timeframe };
}
export const categories = [
  "Pattern Recognition",
  "Interactive Chart Analysis",
  "Options Contract Selection",
  "Risk Management",
  "Trade Execution",
  "Complete Trading Scenarios",
];
export const analysisTasks = [
  "Support",
  "Resistance",
  "Trendline anchor",
  "Higher high",
  "Higher low",
  "Lower high",
  "Lower low",
  "Entry level",
  "Stop-loss level",
  "Profit target",
  "Confirmation candle",
  "False breakout",
];
export function contractExercise(index = 0) {
  const mode = index % 11,
    time = Date.parse("2026-02-02T18:30:00Z"),
    specs = [
      ["A", "call", 100, 21, 0.3],
      ["B", "put", 102, 21, 0.3],
      ["C", "call", 100, 2, 0.3],
      ["D", "call", 100, 60, 0.3],
    ];
  if (mode === 4) specs[3] = ["D", "call", 100, 21, 0.85];
  const chain = specs.map(([id, type, strike, dte, iv]) => ({
    id,
    type,
    strike,
    dte,
    iv,
    ...modelQuote(type, 100, strike, time + dte * 86400000, time, iv),
  }));
  const scenarios = [
    [
      "Bullish objective: 14–30 DTE, absolute delta .50–.70, spread ≤10%, total premium budget $400 before fees.",
      0,
      "A fits all constraints. B is bearish; C and D miss the DTE requirement.",
    ],
    [
      "Bearish objective: 14–30 DTE, absolute delta .50–.70, spread ≤10%, total premium budget $500 before fees.",
      1,
      "B is a put with the required delta, time and budget. Calls oppose the bearish objective.",
    ],
    [
      "Bullish objective: 14–30 DTE, delta .50–.70, maximum $100 premium before fees. Which contract meets every rule?",
      4,
      "No row meets both the DTE/delta band and $100 affordability ceiling.",
    ],
    [
      "Bullish objective: 14–30 DTE, delta .50–.70, maximum proportional spread 1%.",
      4,
      "The modeled spreads exceed 1%; a theoretical midpoint does not satisfy an executable-spread rule.",
    ],
    [
      "Bullish objective: 14–30 DTE, IV at most 40%, delta .50–.70, budget $400. Avoid the earnings-like high-IV row.",
      0,
      "A fits. D has 85% IV; that row can lose value through IV crush even after an upward stock move.",
    ],
    [
      "Buy one A at its ask plus a $0.65 entry fee. Enter the full premium plus entry-fee exposure in dollars.",
      null,
      "Full paid premium × 100 plus entry commission. A planned stop does not cap contractual loss.",
    ],
    [
      "Underlying is $100. Enter the intrinsic value per share of row B (put, strike $102).",
      null,
      "Put intrinsic = max(strike − stock, 0) = $2. The remaining premium is extrinsic value.",
    ],
    [
      "Enter row A full proportional spread as a percentage of midpoint, rounded within 0.1 percentage point.",
      null,
      "(Ask − bid) / midpoint × 100; use executable quotes rather than a nominal dollar spread alone.",
    ],
    [
      "All else considered, which displayed call has the greatest model vega per +1 IV point?",
      3,
      "Longer time generally creates more vega here. Compare the actual displayed model values, not a universal ranking rule.",
    ],
    [
      "Which displayed call has the greatest gamma near this at-the-money stock price?",
      2,
      "The near-expiry ATM call has the largest gamma in this particular chain; its theta exposure is also substantial.",
    ],
    [
      "Which displayed call has the smallest absolute daily theta in this chain?",
      3,
      "Compare the displayed daily theta. Longer DTE can reduce daily decay here; it does not eliminate time risk.",
    ],
  ][mode];
  const numeric = mode >= 5 && mode <= 7,
    answer =
      mode === 5
        ? chain[0].ask * 100 + 0.65
        : mode === 6
          ? 2
          : ((chain[0].ask - chain[0].bid) / chain[0].mid) * 100;
  return {
    id: "contract-" + mode,
    category: "Options Contract Selection",
    prompt: scenarios[0],
    kind: numeric ? "numeric" : "choice",
    chain,
    options: [
      "Contract A",
      "Contract B",
      "Contract C",
      "Contract D",
      "No trade",
    ],
    correct: scenarios[1],
    answer,
    tolerance: mode === 7 ? 0.1 : 0.01,
    explanation: scenarios[2],
  };
}
export function advancedQuestion(category, index = 0, timeframe = "1 hour") {
  const chart = patternFigure(index, timeframe),
    b = chart.bars.at(-1),
    support = Math.min(...chart.bars.slice(-8).map((b) => b.low)),
    resistance = Math.max(...chart.bars.slice(-8).map((b) => b.high));
  if (category === "Interactive Chart Analysis") {
    const task = index % analysisTasks.length,
      highest = Math.max(...chart.bars.map((b) => b.high)),
      lowest = Math.min(...chart.bars.map((b) => b.low)),
      items = [
        [
          "Mark the recent eight-bar support zone.",
          support,
          "The lowest recent wick area is a support reference, not a floor that must hold.",
        ],
        [
          "Mark the recent eight-bar resistance zone.",
          resistance,
          "The highest recent wick area is a resistance reference.",
        ],
        [
          "Mark the first low that could anchor a rising trendline. Use the first candle low; a valid line still needs another defended low.",
          chart.bars[0].low,
          "One point is an anchor, not a confirmed trendline. A second point must occur later and the line may fail.",
        ],
        [
          "Identify the highest visible high price.",
          highest,
          "Compare wick highs, not just closing prices.",
        ],
        [
          "Mark the latest candle low. Compare it with prior lows before labeling it a higher low.",
          b.low,
          "A higher low is relative to a prior swing, not merely a green candle.",
        ],
        [
          "Mark the latest candle high. Compare with prior highs before calling it a lower high.",
          b.high,
          "A lower high needs a preceding higher swing reference.",
        ],
        [
          "Identify the lowest visible low price.",
          lowest,
          "Compare wick lows, including overnight context.",
        ],
        [
          "A rule requires a close above recent resistance plus $0.20. Mark its entry threshold.",
          resistance + 0.2,
          "This is a hypothetical trigger. The visible chart has not yet confirmed it.",
        ],
        [
          "Place an illustrative invalidation $0.20 below recent support.",
          support - 0.2,
          "An underlying invalidation is separate from a premium stop and full premium loss.",
        ],
        [
          "Entry threshold is resistance + $0.20; stop is support − $0.20. Mark an illustrative 2R target.",
          resistance + 0.2 + 2 * (resistance - support + 0.4),
          "Target = entry + 2 × (entry − stop). The market need not reach it.",
        ],
        [
          "A close above the current visible maximum high is required. Has any visible candle confirmed a break of that maximum?",
          0,
          "No visible close exceeds the maximum high. A future confirmation candle is not supplied.",
        ],
        [
          "The last candle must close above its own high to count as the stated trigger. Is this possible?",
          0,
          "A close cannot exceed its own high. The rule itself is impossible; do not trade on it.",
        ],
      ][task];
    return {
      id: "analysis-" + task + "-" + index + "-" + timeframe,
      category,
      prompt:
        items[0] +
        (task >= 10
          ? " Enter 0 for no, 1 for yes."
          : " Click the chart or use the keyboard price input."),
      kind: task >= 10 ? "numeric" : "level",
      chart,
      answer: items[1],
      tolerance: task >= 10 ? 0 : 0.35,
      explanation: items[2],
    };
  }
  if (category === "Risk Management") {
    const items = [
      [
        "$10,000 equity, 1% planned budget, entry $2, premium stop $1, zero exercise fees. Maximum whole contracts?",
        1,
        0,
        "$100 / ($1 × 100) = 1; full premium loss remains $200.",
      ],
      [
        "Three long contracts at $2.40/share with $0.65 entry fee each. Maximum premium and entry fees at risk?",
        721.95,
        0.01,
        "3 × (2.40 × 100 + .65) = $721.95. Exit fees would be additional.",
      ],
      [
        "Planned loss $75 on a $10,000 account: planned risk percent?",
        0.75,
        0.01,
        "75 / 10,000 × 100 = .75%.",
      ],
      [
        "Planned reward $240 and planned stop risk $120: reward-to-risk ratio?",
        2,
        0.01,
        "240/120 = 2R; gap risk can exceed the planned stop.",
      ],
      [
        "Daily loss ceiling $300, already lost $260, next planned risk $50. Enter 0 to reject or 1 to accept under this rule.",
        0,
        0,
        "Remaining daily loss allowance $40 is below planned $50.",
      ],
      [
        "Two calls risk full premiums $400 and $350. Combined premium exposure before fees?",
        750,
        0.01,
        "Sum the full premiums, not only stop distances.",
      ],
      [
        "Two positively correlated calls each have planned risk $100. Combined stated planned risk before correlation stress?",
        200,
        0.01,
        "Adding gives $200; correlation and gaps can worsen simultaneous losses.",
      ],
      [
        "Equity peak $10,000 to trough $9,200: drawdown percent?",
        8,
        0.01,
        "800 / 10,000 = 8%.",
      ],
      [
        "Win probability .40, average win $200, average loss $100: expectancy before costs?",
        20,
        0.01,
        ".4 × 200 − .6 × 100 = $20; estimates are not guarantees.",
      ],
      [
        "Entry $2, stop $1, $100 budget and $1.30 round-trip fees per contract. Maximum whole contracts?",
        0,
        0,
        "$101.30 planned risk exceeds $100, so round down to zero.",
      ],
    ][index % 10];
    return {
      id: "risk-" + (index % 10),
      category,
      prompt: items[0],
      kind: "numeric",
      answer: items[1],
      tolerance: items[2],
      explanation: items[3],
    };
  }
  if (category === "Options Contract Selection") return contractExercise(index);
  if (category === "Trade Execution") {
    const tasks = [
      {
        prompt: `A completed-close rule requires a close above ${(resistance + 0.4).toFixed(2)}. Last visible close is ${b.close.toFixed(2)}. What follows?`,
        options: [
          "Buy a call immediately",
          "Wait for confirmation",
          "Assume the next candle breaks out",
          "Double the budget",
        ],
        correct: 1,
        explanation:
          "The required completed close is absent. Waiting receives full decision credit; no future candles were used.",
      },
      {
        prompt: `Your written call plan requires an exit after an hourly close below ${(b.close + 0.3).toFixed(2)}. The visible close is ${b.close.toFixed(2)}. No gap or quote restriction is stated. Which respects that rule?`,
        options: [
          "Ignore the rule because the trade might recover",
          "Reassess and execute the planned exit at an available quote",
          "Add contracts without a new plan",
        ],
        correct: 1,
        explanation:
          "The stated invalidation occurred. The model uses a later available bid, not a guaranteed stop price.",
      },
      {
        prompt:
          "A trigger occurred earlier, but a new entry now needs $150 planned risk against a $100 budget. Which decision respects the budget?",
        options: [
          "Round size upward",
          "No trade at this price",
          "Call the excess risk a fee",
        ],
        correct: 1,
        explanation:
          "Do not chase after the allowable whole-contract risk is exceeded.",
      },
      {
        prompt:
          "A predeclared premium target is $5; the currently available bid is $5.10. Which action follows a rule requiring a target exit?",
        options: [
          "Take the rule-based paper exit",
          "Wait for a guaranteed $6",
          "Widen the stop to zero",
        ],
        correct: 0,
        explanation:
          "The available bid meets the stated target. Future extension is unknown.",
      },
      {
        prompt:
          "A valid written plan loses at its defined stop under the documented execution assumptions. How should it be reviewed?",
        options: [
          "Automatically assign zero process credit",
          "Assess rule adherence separately from the losing P/L",
          "Erase the losing observation",
        ],
        correct: 1,
        explanation:
          "A loss does not establish a poor decision; assess information and adherence independently.",
      },
    ][index % 5];
    return {
      id: "execution-" + (index % 5),
      category,
      kind: "choice",
      chart,
      ...tasks,
    };
  }
  if (index % 13 === 12) {
    const flat = patternFigure(index, timeframe);
    flat.bars = flat.bars.map((b, i) => ({
      ...b,
      open: 100 + Math.sin(i) * 0.12,
      close: 100 + Math.sin(i + 1) * 0.12,
      high: 100.3,
      low: 99.7,
    }));
    return {
      id: "no-pattern-" + timeframe,
      category,
      kind: "choice",
      chart: flat,
      prompt:
        "A rule requires an impulse of at least 2% followed by a smaller pause. What does this narrow alternating range establish?",
      options: [
        "No qualifying impulse/pause structure; wait",
        "A guaranteed bull flag",
        "A guaranteed bear flag",
      ],
      correct: 0,
      explanation:
        "The supplied bars never form the required 2% impulse. No trade is a valid decision under the stated rule.",
    };
  }
  const item = library[index % library.length];
  return {
    id: "pattern-" + index + "-" + timeframe,
    category,
    prompt:
      "Which description best fits the visible structure? Some charts have no actionable trigger.",
    kind: "choice",
    chart,
    options: [
      item.title,
      "Guaranteed profitable breakout",
      "No uncertainty remains",
    ],
    correct: 0,
    explanation:
      item.explanation +
      " Recognition alone does not establish an actionable trigger, contract or valid fill.",
  };
}
