# Options chain implementation checklist

Review branch: `feature/papermoney-2-hourly`. Baseline: `8e90708`. No redesign changes existed at resume; PaperMoney 2.0 features and 54 tests were retained.

- [x] Shared compact chain for Practice Trading and Market Replay
- [x] Buy/Sell, Call/Put, expiration/DTE, sort and price divider
- [x] Deterministic synthetic volume/OI and consistent executable spread
- [x] Break-even-based theoretical COP and financial edge cases
- [x] Expandable details and persistent Beginner/Advanced columns
- [x] Owned-long closing, quantity/capital validation, market/limit ticket
- [x] Simulated Returns controls, payoff graph and model valuation
- [x] Selected-contract handoff to Lab, strategies and journal
- [x] Regression/financial tests and production build
- [x] Browser desktop/mobile workflow checks
- [x] Focused commits pushed to existing PR; production remains unmerged

Updated at each implementation checkpoint. Assumptions and final verification are documented in `options-chain.md`.

Published implementation commit: `6ea99eac9a1630e43a203236e0528b22aece1bab`. [PR #1](https://github.com/aarondpana/papermoney/pull/1) remains open. [CI run 45456614455](https://github.com/aarondpana/papermoney/actions/runs/45456614455) passed tests and production build. Uploaded tree verified against local source. No outstanding implementation items; intentional model/order limits are in `options-chain.md`.
