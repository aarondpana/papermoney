# PaperMoney

A free, static options paper-trading classroom. No account, brokerage connection, paid API, analytics, backend, or production dependency. All funds are fictional.

## Run locally

Use Node.js 22 or newer. Run `npm ci`, `npm test`, `npm run build`, and `npm run dev`. Open http://localhost:4173. The build verifies the checked-in static `dist/` artifact; ES modules run directly in the browser. Hash navigation and relative assets support GitHub Pages repository subpaths and refreshes.

## Deploy

`.github/workflows/pages.yml` runs tests, verifies the artifact and deploys `dist/` on pushes to `main`. In repository Settings → Pages, select **GitHub Actions** if automatic Pages enablement lacks permission. Re-run the workflow after enabling. The intended URL is https://aarondpana.github.io/papermoney/ (only a successful deployment and HTTP/browser verification establish publication).

## Features and structure

Seven sections: Dashboard, Practice Trading, Portfolio, Guided Lessons, Challenges, Journal, Settings. Each account starts at $10,000. Funding changes create ledger deposits/withdrawals and adjust capital without rewriting P/L. Simulated practice, manual snapshot practice, and modeled scenario accounts have separate balances and positions. Challenge attempts are deterministic isolated exercises and never execute account trades.

- `dist/pricing.js`: zero-rate, zero-dividend Black–Scholes European option prices, numerical Greeks, terminal payoff and risk.
- `dist/accounting.js`: account state, funding, cash reservations, equity and P/L.
- `dist/execution.js`: validated strategy builder, atomic fills/closures, stock trades and settlement.
- `dist/storage.js`: versioned local storage, validated backups and CSV.
- `dist/lessons.js`: 14 original lessons with exercises and knowledge checks; 8 challenges and primary educational source links.
- `dist/app.js`, `dist/style.css`: accessible responsive browser interface. No frontend secrets or external requests are required.

## Pricing and execution

USD; standard 100-share unadjusted equity options only. The theoretical model assumes European exercise, constant volatility, no dividends and zero interest, using a 365-day year. Real American-style equity options, dividend effects, early assignment and actual share delivery are not reproduced. Zero volatility and expiration use intrinsic value directly. Numerical Greek units are per share: delta per $1 stock move; gamma per $1 delta change; theta dollar change over one calendar day; vega dollar change per +1 percentage point IV. Greeks near expiration and discontinuities are only local approximations.

The simulation clock advances only by explicit whole-day actions; reloading never advances it. Presets apply reproducible daily changes: rising +1%, falling −1%, sideways alternating $0.15, volatility spike sets IV to 80%, crush to 15%, approaching-expiration suggests 25 days of manual advancement. Change price and IV independently or choose expiration dates representing 1, 7, 30 or 60 days for new positions. Existing contracts retain their fixed expirations. Scenario workspaces start from a snapshot underlying price but use an explicitly assumed 30% IV, never inferred live data.

Simulated bid/ask = rounded theoretical midpoint ± max($0.01, 2.5% of midpoint), with bid floored at zero. Purchases fill ask, sales fill bid; closing uses opposite sides. Spreads fill and close atomically at each leg's displayed side. No slippage, quoted-size liquidity, fees or actual execution is modeled. Stock fills use displayed underlying price without a spread. Immediate option round trips lose the spread.

Open equity = cash + stock market values + signed option midpoint values. Estimated liquidation uses bid for longs and ask for shorts. Cash collateral is reserved, not subtracted a second time from equity. Unrealized P/L compares current midpoint/stock values with entry debits/cost basis. Realized P/L records closures/settlements and stock-sale gains; funding is excluded.

## Strategies and collateral

Long calls, long puts, covered calls, cash-secured puts, bull-call and bear-put debit spreads, bull-put and bear-call credit spreads. Vertical legs match underlying, expiration and quantity. The order builder prevents naked calls, unowned stock sales and unsupported combinations. Each covered call reserves 100 owned, uncommitted shares; the preview includes stock basis in whole-position risk. Each short put reserves strike × 100 × quantity. Credit spreads reserve gross width × 100 × quantity, with received credit added to cash; effective buying-power reduction is width less credit. Debit spreads consume their debit. No borrowing is allowed.

## Expiration policy and limitations

**Educational cash settlement, not real brokerage behavior.** On each simulation day, expired contracts pay signed intrinsic value once and are removed. Covered-call expiration also sells exactly the committed shares at the terminal underlying price, records the stock gain/loss, then cash-settles the short call. This prevents unfunded cash liabilities; it is an educational liquidation, not real assignment. Before expiration, a covered call with insufficient cash to buy back the short option requires additional fictional funding; shares remain reserved until closure. Snapshot expiry requires an explicit action after the contract's expiration and an entered final underlying price; the simulation clock never expires snapshots.

Snapshots are manually entered, never live or automatically refreshed. Freshness limit: 15 minutes, with future timestamps and expired contracts rejected for fills/import. Quote sources/times stay visible. Last snapshot midpoint marks can be stale and remain labeled as manual. Update every matching leg to close stale positions. IV and Greeks show Unavailable for snapshots. CSV example/export/import work without services; examples must be replaced with real permitted quotes.

## Storage and backups

`papermoney.v1` localStorage contains all accounts, snapshots, journals, settings and learning progress. No cross-device sync. Clearing browser data may erase everything. Export JSON in Settings. Imports are parsed and validated before confirmation and replacement; unknown schemas are rejected (no historical schema predates v1). Corrupt existing data is preserved and saving blocked until a valid restore or explicit reset. Storage exceptions leave the session usable in memory with a visible warning. JSON backups are local learning records, not brokerage statements. Use only backups from trusted sources.

## Verification

`npm test` uses Node's built-in test runner, without test dependencies. Tests cover multipliers, both long-option payoffs, all four spreads and collateral, share reservations, cash-secured puts, bid–ask losses, realized/unrealized P/L, duplicate and repeated settlement guards, atomic failures, insufficient funds, invalid/stale quotes, pricing edge cases, CSV, backup restoration and account separation. Browser QA is documented in `QA.md` with actual results and any limitations.

Educational references are linked from each lesson, including SEC Investor.gov, FINRA and OCC's Options Industry Council. This is an original learning interface, not a Robinhood product or a broker emulator.

## Learning update — November 23, 2026

Challenges now provides 92 curated local questions across 40 chart-guide concepts: 80 chart-inspection questions (including eight chart-region tasks) and 12 numerical applications. Quick Practice selects 10; By Topic selects up to 10 available questions; Mixed Quiz selects 20 and withholds scoring/explanations until submission; Review Mistakes draws from latest incorrect answers. First-attempt accuracy, hinted attempts, topic accuracy and recovered mistakes are tracked separately. Choices are shuffled by stable option IDs, with a saved seed and no duplicates within a session.

Guided Lessons retains all 14 options lessons and adds **How to Day Trade — Ross Cameron Study Track**: 12 stock-focused lessons, 12 practical exercises, 36 knowledge checks, three synthetic diagrams and a searchable 35-term glossary. Completion requires correct work and an explicit action. Previous/next navigation and concept-practice/reference links connect the tracks without falsely attributing chart-guide content to the book.

Source maps and coverage: `docs/chart-source-map.json` maps all 112 physical chart-guide pages; `docs/book-source-map.json` maps all 220 book pages. Chapter 9 begins physical page 126 / printed page 112. Coverage documents identify numbering, ambiguous terminology, source limitations and original interpretations. No complete source PDF, screenshot or extracted book text is published. All candles, volume, SMA/VWAP values, prices and trading conditions in the new website charts are original fictional examples. No runtime AI or market-data service is needed.

New modules: `chart-content.js`, `daytrade-content.js`, `training-engine.js`, `training-storage.js`, `training-charts.js`, `training-ui.js` and `training.css` under `dist/`. Charts are generated on demand as responsive SVG with an expanded view, neutral accessible text, OHLC tables and keyboard-operable region alternatives. Later bars are not supplied, so there is no hidden historical outcome to reconstruct. Only after answering are relevant candles/regions highlighted and explanations/source references shown. By Topic intentionally identifies the selected topic.

Storage schema v2 retains the existing `papermoney.v1` localStorage key to discover old data. Version-one objects migrate by cloning all original fields and adding a separate learning object. Accounts, positions, stocks, ledger, journals, options completion and old `challenges` IDs remain intact. Old challenge IDs are legacy completions, not new chart completions. New lesson/session/attempt records are included in validated JSON exports/imports. Corrupt/unknown backups remain rejected. Keep a backup: browser storage still does not sync across devices. Do not use a v2 backup with an old v1-only application.

No live brokerage/account-rule or settlement guidance has been added from the historical book. Author screening preferences are labeled as his 2023 choices. Conventional candle terminology and conceptual short-sale risk are separately sourced in the affected lessons. Quiz results do not establish live-trading readiness.
