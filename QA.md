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
