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
- [ ] Focused commits pushed to existing PR; production remains unmerged

Updated at each implementation checkpoint. Assumptions and final verification are documented in `options-chain.md`.
