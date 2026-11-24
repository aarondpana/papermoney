# Options chain redesign

Implemented on the existing `feature/papermoney-2-hourly` review branch. The original accounts, storage key, options lessons and hourly workspaces remain in place. No runtime packages, paid APIs, branding assets or proprietary Robinhood calculations were added.

## Behavior

Practice Trading and Market Replay share the compact chain. Buy/Sell and Call/Put are independent controls. Expiration labels use the simulation clock and fractional calendar DTE. Strikes default high to low with an underlying-price divider and an initially centered internal scroll panel. Beginner shows volume, OI, COP, delta and executable price; Advanced adds saved custom columns. Expanded rows expose prices, Greeks, intrinsic/time value, break-even and hypothetical terminal risk.

Ask selection opens a long-option ticket; bid selection closes an eligible owned standalone long lot. Whole quantities, buying power, ownership, quote freshness and review-before-submit are checked. Partial closes allocate basis proportionally. Naked short openings are disabled. Existing covered and spread builders remain under Advanced strategies. Closing is market-only. Limit buys are conditional: Practice checks a later whole-day step, Replay checks a later completed base bar. Funds are revalidated at fill rather than reserved at placement. Orders can be canceled; no fill is inferred from an earlier candle low.

Returns support future underlying, date/time in UTC, IV, premium and quantity. Clicking the payoff chart changes future price; keyboard users can enter the same price directly. Expiration uses intrinsic payoff and earlier times use the existing European pricing function. The chart labels current price, expiration break-even, future input, zero P/L and positive/negative regions. Lab and strategy actions carry the selected contract into their existing tools; strategy handoff creates an editable study draft, not a saved rule or recommendation.

## Financial assumptions

One contract represents 100 shares. Round-trip commissions enter COP and terminal risk; entry slippage enters the premium. A call's net expiration break-even is strike plus net cost, a put's is strike minus net cost. COP uses the risk-neutral terminal lognormal distribution with drift r − q − sigma²/2, calendar years of 365 days and the break-even threshold. It is not delta, a forecast of real-world success, a pre-expiration exit probability or Robinhood's proprietary COP. Zero-volatility and expiry calculations use strict positive P/L. Sell-row COP and terminal risk describe a hypothetical short held to expiry; the notice distinguishes this from selling an owned long to close. Short payoff graphs are analysis only.

Synthetic OI is reproducible from contract identity. Synthetic volume is distinct and grows with the modeled session, resetting by simulation date. Higher modeled OI generally narrows the executable spread while preserving the midpoint and Greeks. Practice uses a whole-day snapshot; Replay uses fixed-EST session progress. Quotes, fills and replay valuations share the same clock, IV scale and spread adjustment. Manual actual snapshots retain their original strict validation; unprovided IV, liquidity and Greeks are unavailable rather than fabricated. Returns can use an explicitly labeled editable IV assumption.

Remaining model limits: DEMO liquidity is synthetic, not actual exchange volume/OI. European pricing, simplified execution and educational settlement do not reproduce American exercise, order books, market impact, holiday/DST calendars or live brokerage fills. Future return estimates exclude unknown future executable spreads. Pending conditional orders do not reserve funds. Sell-to-open naked options and limit closes are intentionally unsupported.

Primary references: [Robinhood chain metrics](https://robinhood.com/us/en/support/articles/options-chain-metrics/), [OIC delta](https://www.optionseducation.org/advancedconcepts/delta), [OIC Black-Scholes](https://www.optionseducation.org/advancedconcepts/black-scholes-formula). The implementation is independently modeled and does not claim equivalent probabilities.

## Files

New: `dist/chain-ui.js`, `dist/chain-model.js`, `dist/chain-orders.js`, `dist/chain.css`, `tests/chain.test.js`, this document and `docs/options-chain-checklist.md`.

Updated: `dist/app.js`, `dist/platform-ui.js`, `dist/platform-engine.js`, `dist/execution.js`, `dist/pricing.js`, `dist/storage.js`, `dist/index.html`, `scripts/build.js`, `tests/platform.test.js`, `README.md`, `QA.md`. Existing pricing formulas are reused; normal CDF is exported for COP. Execution adapters delegate existing trade functions. Storage extensions are optional and validated; no account or learning progress reset is needed.

## Verification — 2026-11-24

- 72 tests pass: 54 retained regression tests plus 18 chain tests covering COP and costs, invalid input, zero IV/expiry, volume/OI, spread, sorting/divider, returns, partial closes, journal history, quote consistency, pending orders and restore.
- Production build validates every required static file, JavaScript syntax and local module reference. There are no runtime dependencies.
- Browser: bought two fictional calls in the isolated scenario, reviewed/submitted and partially then fully closed them. Portfolio quantity, proportional basis, realized P/L and ledger matched the bid/ask fills. Replay entry, hourly advance, DTE/quote update, owned-long exit and journal were verified.
- Browser: expandable analytics; put and sort controls; Advanced mode persisted across reload; Lab/strategy handoff; expiration and pre-expiration returns; chart click; pending limit creation/reload/cancel; mobile order review and internal table scrolling. Tested 390×844 and 1280×900. No horizontal document overflow observed. No browser console errors captured.
- Original simulated practice account remained $12,029 equity, $29 realized and no positions. Existing manual account and learning data were not reset. Test fills remain identifiable in isolated scenario/replay history.
- Review-only CI uploads the static artifact. Production Pages workflow is unchanged. This redesign is not merged or deployed to production; use the existing PR and local preview for review.
