# Verification record

Verified October 25, 2026 (America/Denver).

- Node tests: 15 financial/accounting/storage tests passed locally (the first 14 also passed in GitHub Actions).
- Production artifact check: passed locally and in GitHub Actions; npm ci succeeds with the dependency-free lockfile.
- Browser flow: recorded deposits, bought one DEMO 100 call at $3.52 × 100, advanced rising preset one day, observed midpoint P/L, closed at $3.81 for $29 realized profit, edited linked journal. Reload preserved journal, funds and paused clock.
- Lesson: completed numeric exercise plus knowledge check for Stocks versus options; completion saved.
- Snapshot: entered a clearly synthetic QA quote through the form. IV/Greeks showed Unavailable. Stale quote blocked the order. After timestamp update, bought at $2.10 ask and closed at $2.00 bid: $9,990 equity and −$10 realized P/L in separate snapshot account.
- Mobile: 390 × 844 viewport. Document stayed within viewport; chain scrolls within its table container. Navigation, quote entry, preview and closure worked.
- Accessibility: semantic navigation, labeled forms, native modal focus, keyboard focus styling and SVG chart labels reviewed. No full screen-reader audit performed.
- GitHub: source uploaded automatically via connected API to main after local Git credential helper failed. Remote head verified.
- Deployment: workflow 40163490274 passed installation, tests and build, then failed creating Pages: `Resource not accessible by integration`. Website is not published. Browser GitHub session is signed out and no usable cached Git credential is available for administration.

Remaining deployment action: owner opens Settings → Pages → Build and deployment → Source: GitHub Actions, then re-runs latest Test and deploy GitHub Pages workflow. Later main pushes deploy automatically. Intended URL: https://aarondpana.github.io/papermoney/ (not verified live).

Limitations: European theoretical model; no dividends, early assignment, liquidity, slippage or fees. Educational cash settlement and covered-share liquidation are disclosed in app and README. Quotes are manual, never live. Data stays in the browser and needs backups.

## Learning update / 2026-11-23

Local tests: 28 passed, including 15 original financial/accounting tests and 13 new learning/content/migration tests. Tests cover source-reference coverage, unique IDs, all answer mappings after shuffling, numeric tolerance boundaries, valid synthetic OHLC, no future candles, neutral pre-answer SVG markup, focusable region targets, v1 migration preserving a funded account/open position/journal/old progress, v2 backup restoration, bad-data rejection and first-attempt/review statistics. Production artifact checks passed.

Browser QA: completed a 10-question Quick Practice session; completed and submitted a 20-question Mixed Quiz, verifying no answer-feedback elements before submission and 20 after submission; corrected a prior mistake with a marked hint and verified review recovery; followed its source reference card; tested filtered By Topic; selected a region with Enter and expanded the chart. Completed a book lesson only after its exercise and three checks, then reloaded and verified saved completion. Searched the glossary for float and confirmed existing options curriculum (13 uncompleted/one previously completed) still renders. Existing simulated account equity remained $12,029 with $29 realized P/L. At 390 × 844 the document stayed within viewport and the detailed chart scrolls inside its own container. Physical touch hardware and a full screen-reader audit were not available; equivalent pointer controls and keyboard alternatives were checked.

Public deployment result is recorded in the final delivery after the new commit's workflow completes. Historical deployment failures above are retained as audit history rather than treated as current success.

Live tablet QA found long source filenames could overflow cards at intermediate widths. Applied source-reference wrapping across all widths and reset scroll position on page navigation. Mobile horizontal scrolling remains confined to detailed chart/table containers. Deployment is verified in the final delivery; these observations amend the earlier visual checks.
