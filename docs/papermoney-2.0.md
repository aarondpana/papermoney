# PaperMoney 2.0 implementation and model report

Prepared 2026-11-24 on `feature/papermoney-2-hourly` for review. Production deployment remains gated by merge to `main`; the existing Pages configuration is retained.

## Original architecture and preservation

The baseline at `683919c81843d12275175f47d1ebec43ad057f0c` is a buildless ES-module application. `app.js` renders hash routes; `pricing.js`, `accounting.js` and `execution.js` own theoretical prices and the original three account workspaces. `storage.js` validates JSON backups under `papermoney.v1`. Separate training modules contain the 14 options lessons, 12 Ross Cameron lessons and 92 chart questions. The original 28 automated tests passed before changes.

The upgrade extends that architecture. No framework, runtime dependency, backend, login, paid API or live-data connection was added. Legacy accounts and progress are not moved into replay or backtesting accounts. Old hash routes, including `#Journal`, still work. The visual palette and original curriculum remain intact.

## Implemented workflows

| Area | Behavior |
|---|---|
| Navigation | Overview, Learn, Trade, Develop and System groups; hash detail routes; dedicated mobile workspace selector; old routes retained |
| Hourly learning | 15 modules with objectives, original candle illustrations, worked numeric examples, successful/failed process examples, mistakes, options applications, two assessments each, exercises and explicit completion gates; 15 numeric exercises and 30 assessments |
| Pattern Library | 42 references: 40 retained source concepts plus explicit support/resistance references; name search and applicability, direction, type, difficulty and viewed-state filters; separate hourly, intraday adaptation and specialized categories; continuation/failure illustrations, confirmation/invalidation and risk discussions |
| Original Challenges | All 92 source-linked questions, Quick/Topic/Mixed/Review modes and original progress retained |
| Advanced Challenges | Six categories; independent interval-specific illustrations for 1/5/15-minute, hourly, 4-hour and daily practice; pattern/direction/difficulty filters; 12 chart-analysis task variants, 11 actual modeled-chain exercises, 10 risk calculations and five execution decisions; bounded price answers and feedback overlays |
| Complete scenario | 15 saved stages connecting completed daily/hourly analysis, written decisions, ten objective process checks, entry/invalidation/target planning, contract/size decisions, real replay order ticket, progressive reveal, management and automatic journal review. Waiting is valid; objective score excludes P/L. Narrative quality is self-reviewed, not automatically understood by an AI |
| Market Replay | Seeded base data; advance one or multiple 15-minute candles; play/pause/speed; restart/randomize; independent cash, positions and equity; long calls/puts; modeled chains; market/queued limit orders; stops/targets; concurrent limits; risk sizing; automatic exits and records; refresh persistence |
| Replay chart | OHLCV, UTC timestamps, crosshair, button zoom/pan, support/resistance and two-point trendline drawings with numeric/time keyboard alternatives, entry and exit markers, premium-management labels, indicator toggles, accessible OHLCV table |
| Indicators | EMA9, EMA20, SMA50, SMA200, RSI14, ATR14, volume and per-session typical-price VWAP approximation. Unavailable warm-up values remain null; display-window indicators use all available prior bars, not future or hidden outcome bars |
| Options Lab | Shared model, fractional DTE, type/spot/strike/IV/rate/dividend/quantity/premium inputs; Greeks, intrinsic/extrinsic, maximum premium exposure, break-even, P/L and return; five plot families and IV-crush/theta/moneyness/direction-loss/DTE presets |
| Strategies | Ten templates; save/edit/duplicate; objective trigger, trend, volume, direction, stop, target, holding, DTE/delta/spread/IV, risk, daily loss and concurrent-position settings; intraday/overnight control; watchlist and thesis notes preserved as documentation |
| Backtesting | Executable close-based rules, next-open entries including entry-bar exposure, multiple positions within configured limits, costs, chronological full/training/out-of-sample segments, all-trade table, closed-trade equity/drawdown curves, comparison archive and exports |
| Journal | Original reflections retained; available Practice Trading entry details enriched; replay fills populate contract, Greeks, timestamps, risk, costs, excursions, chart seeds and exit details; search/source/strategy/pattern filters, sorting, editable process review and CSV/JSON exports |
| Dashboard / development | Replay metrics separated from original account performance and quiz accuracy; strategy/pattern/timeframe/ticker/DTE/condition breakdowns, skill accuracy, next lesson/practice links and seven configurable educational milestones. No synthetic sample profits inserted into user accounts |

## Financial assumptions and execution

- The existing `price` function is extended with optional annual risk-free rate and continuous dividend yield. Its original callers retain zero-rate/zero-dividend defaults. Time is actual fractional calendar days / 365. At zero time, value is intrinsic; zero volatility uses discounted deterministic payoff. Model validation rejects nonfinite/unsupported inputs.
- This is a European Black–Scholes–Merton illustration. It does not reproduce American exercise, early assignment, borrow availability, dividends paid in cash, volatility surfaces, halts, auctions or a broker's exercise decisions. OIC describes these models as theoretical estimates, not reliable future executable premiums.
- Replay buys at simulated ask plus per-share slippage, sells at bid minus slippage, applies per-contract fees, and uses a 100-share multiplier. Model midpoint marks and executable sides are labeled separately. Fill quantity cannot exceed configured liquidity; there are no invented partial fills or exchange queues.
- Queued limit buys are evaluated only against a later available quote. A previous candle low cannot be used as a retrospective entry. Pending orders that cannot satisfy the modeled constraints are canceled. There are no guaranteed fills.
- Stop and target premiums are evaluated using model prices over available OHLC. When both could touch, the stop takes precedence. A gap through a stop uses the worse opening bid. This is conservative sequencing within a simplified price/IV model, not a promise that real gap losses are bounded by the modeled quote.
- Planned stop risk includes round-trip fees and differs from full premium loss plus applicable fees. Whole-contract sizing rounds down and can produce zero contracts. Replay new entries enforce the entered risk budget, daily realized-loss and concurrent-position caps. Exit fees are reserved at entry. Increasing fees while positions are open must still leave cash to pay exits.
- Synthetic prices come from seeded regimes with noise, gaps, reversals, failed breaks and an earnings-like IV transition. The seed is reproducible; the choice of seed is not evidence of profitability. Scenario IV is scaled by the configurable base-IV assumption.
- Synthetic sessions are fixed-EST weekdays beginning 09:30, ending 16:00, with 26 base candles. Weekends create real calendar-time decay; US exchange holidays are not modeled. Last hourly/4-hour buckets can be shortened. Only full hourly buckets create strategy signals. Relative volume is normalized per base interval.
- Replay candles are deterministic client-side data, not secret encrypted market history. The interface, indicators and scaling exclude future candles. Source-code inspection can reconstruct synthetic outcomes; this application is for learning, not secure examinations.
- Expiration is educational intrinsic cash settlement at a visible modeled observation, not equity-share delivery. IV is held constant within each OHLC interval when approximating option extremes. Fees and coarse bars can materially change results.

## Objective strategy behavior

The current rules engine specializes in hourly signals with completed daily EMA context and 15-minute base data. It compares the prior eight completed hourly bars. Supported triggers are breakout, EMA9 pullback, EMA9 cross reversal and failed-break reversal. Volume and EMA trend constraints are executable. An entry signal is evaluated at a close; execution occurs at the following open. The entry bar is exposed to stop/target tests. Maximum holding is counted in hourly chart buckets, not elapsed wall-clock hours. An intraday preset disables overnight holding; a swing preset permits it.

Contract selection searches a strike grid for the saved absolute-delta, spread and IV band. It uses the minimum allowed DTE, which must also satisfy the saved maximum; candidates closest to absolute delta .60 are preferred. The watchlist and free-text pattern thesis are labels, not executable screeners or live multi-ticker prices. The default study watchlist and 14–30 DTE/.50–.70 delta/.75% risk/2R settings are experimental educational settings, not a validated strategy.

All derived results come from executed rules and priced fills. Equity and maximum drawdown in backtest reports use completed-trade observations, not a complete marked intratrade equity series; replay separately records marks during advances. Expectancy = total net P/L / completed trades. Profit factor = gross positive P/L / absolute gross negative P/L; no-loss/empty cases are labeled without serializing infinity. R uses initial planned stop risk including fees. Break-even trades reset both win/loss streaks. Fees and estimated slippage impact are reported, with slippage already embedded in P/L. Sharpe is omitted because closed-trade events are not a suitable periodic return series.

## Data imports and integrity

CSV: `time,open,high,low,close,volume`, ISO UTC timestamps, completed 15-minute US regular-session bars. No quoted free-text CSV fields are needed. JSON:

```json
{"name":"Permitted underlying dataset","kind":"underlying-only","bars":[{"time":1767624300000,"open":100,"high":101,"low":99,"close":100.5,"volume":10000}]}
```

The snippet demonstrates a row shape; a valid dataset needs 30–30,000 bars. Input is limited to 8 MB. Prices must be positive, volume nonnegative, OHLC coherent and timestamps strictly increasing. Imports must be consecutive 15-minute regular-session bars; complete prior sessions are required. New York timezone conversion handles DST for imported data. The final session may be partial; unsupported/missing intervals are rejected rather than fabricated. Synthetic files must declare `kind: "synthetic"` and retain their source labels. Browser quota can prevent large imports from persisting; export backups regularly.

`kind: "underlying-only"` results are **historical underlying / model-priced option simulations**, not actual historical options backtests. The model uses explicitly assumed IV when not provided. Underlying survivorship and data quality remain properties of the user's permitted dataset; the app cannot certify them.

An actual-quote import schema is recognized with `kind: "option-quotes"`, `bars`, and a nonempty `quotes` array containing numeric UTC `time`, `expiry`, `strike`, `bid`, `ask`, and `type` (`call`/`put`). Quote-side validation exists, but actual-quote strategy execution is **not implemented**. Such runs are rejected explicitly instead of falling back silently to theoretical prices. No actual historical options dataset is bundled.

Training/out-of-sample segments are chronological 70%/30%. Warm-up may use earlier observations; orders and P/L belong to the selected interval. Frozen strategy snapshots are saved with results. These controls reduce accidental leakage but cannot prevent a user repeatedly tuning on the same seed or selected data. Small samples and repeated optimization are warned against.

## Persistence and migration

The top-level schema remains version 2 and the key remains `papermoney.v1`. This intentionally preserves discovery by the prior application. A separately versioned `platform: {version: 1, ...}` extension owns replay state, saved strategies/datasets/runs, hourly progress, advanced attempts, pattern views, milestones and journal archives. Version-one top-level data still migrates through the original learning migration; existing v2 data gains the extension without rewriting accounts or completed IDs. Early platform records gain newly introduced default cost/limit fields through migration.

Exports include the extension. Restore validates original accounts plus new numeric fields, progress IDs, replay trades/orders, drawings, metrics, datasets, strategies and schema versions before replacing data. Corrupt backups remain blocked without overwriting original browser storage. Old v1-only software cannot safely restore a new backup. This is local browser persistence, not cross-device sync. Replay restart archives completed trades; open replay positions and pending orders are reset only through the explicit restart control. Browser-local chart seed/state is saved; no screenshots or private records are sent to GitHub.

## New and modified project files

New:

- `dist/platform-engine.js`: scenarios, aggregation, indicators, pricing adapter, sizing, replay, rules, backtests, metrics and platform validation.
- `dist/hourly-content.js`: 15 lessons, 42-reference library metadata, interval-specific illustrations and advanced exercises.
- `dist/platform-charts.js`: SVG candles, drawings, indicators, crosshair, tables and analytical plots.
- `dist/platform-ui.js`: hourly lessons, library, advanced practice, staged scenario, replay, lab, strategies, tests, journal and progression interfaces.
- `dist/platform.css`: responsive additions matching the existing identity.
- `tests/platform.test.js`: 26 new financial, simulation, data and migration tests.
- `.github/workflows/review.yml`: review-only checks and static artifact; no deploy permission.
- `docs/papermoney-2.0.md`: this report.

Modified: `dist/app.js`, `dist/index.html`, `dist/pricing.js`, `dist/storage.js`, `scripts/build.js`, `package.json`, `package-lock.json`, `README.md`, `QA.md`. Existing source maps and supplied PDFs remain separate; no copyrighted screenshots or extraction files were added.

## Verification and review status

The expanded suite contains 54 tests (28 baseline, 26 new). Run `npm test` for actual current results. Coverage includes rates/dividends/parity, Greeks, fractional expiration, valid OHLC/aggregation, indicator warm-up/reset, seeded determinism, prefix-only calculation/markup, modeled fills, affordability and risk/concurrency limits, gap stops, expiry, analytics edge cases, contract-chain answer accuracy, chronological rules, later-data mutation invariance, DST imports, persistence and corrupt-data rejection.

Browser checks performed against the feature branch: preserved original $12,029 equity/$29 realized P/L; replay market entry, advance, reload, bid exit and automatic journal; strategy save/reload and calculated backtest; hourly lesson completion/reload; contract answer feedback; direction-correct/loss-making Lab preset; library search/detail; staged no-trade workflow through objective 10/10 review and reload; mobile 390×844 layout with chart scrolling and workspace navigation. Additional final checks and CI status are recorded in the PR. No full screen-reader or physical touch-device audit was performed.

Build: `npm run build` validates all required static files, JS syntax and module references and emits `dist/.nojekyll`. `npm ci --ignore-scripts` installs no production dependency. Run locally with Node 22+: `npm ci`, `npm test`, `npm run build`, `npm run dev`; open `http://localhost:4173`. All assets are relative and routes use hashes.

Review deployment: feature pushes/PRs run `Validate review branch` and upload `papermoney-review-static`. After review and merge, `Test and deploy GitHub Pages` publishes `dist/` using the existing unique artifact name and metadata-visibility wait. Pages Source must remain GitHub Actions. Verify its deployment run and both old/new routes before calling a release published.

## Remaining model and product limits

Actual historical option-quote execution, full multi-ticker historical portfolios, spread/short-option replay, exchange holidays/auctions, American exercise/assignment, tick-level order books/partial fills, custom indicator periods, free-form executable strategy languages, automated semantic grading of written plans, image uploads and robust intratrade portfolio-risk statistics remain future work. Indicator visibility is configurable; their listed periods are fixed. The current replay overlay labels premium stops/targets on entries; it does not pretend a unique stock price maps to a premium stop under changing IV. The journal exposes detailed records and editable process tags; it does not reconstruct unavailable historical Greeks or chart screenshots for old trades.

These limitations are deliberate disclosures, not hidden paid integrations or fabricated datasets. Completing milestones and quizzes is not certification for real-money trading.

## References

- Supplied `ChartPatternsv2.pdf`, source map covering 112 physical pages: `docs/chart-source-map.json`; original page-by-page visual review and ambiguity notes are retained in its coverage document. All added illustrations and hourly options rules are original adaptations.
- [OIC: Black–Scholes formula](https://www.optionseducation.org/advancedconcepts/black-scholes-formula) and [Volatility & Greeks](https://www.optionseducation.org/advancedconcepts/volatility-the-greeks): theoretical pricing framework and sensitivity definitions.
- [SEC investor bulletin: Introduction to options](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-63): long-option premium risk.
