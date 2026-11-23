# Ross Cameron study-track source coverage

Source: Ross Cameron, *How to Day Trade: The Plain Truth* (2023), user-supplied `HowToDayTrade_byRossCameron_2023_DigitalGiftCopy.pdf`.

## Method and numbering

The source map was created before drafting the lesson module. All 220 physical PDF pages were extracted locally and mapped by contents/chapter boundaries. Forty-eight selected instructional pages were rendered and visually inspected, including the relevant candle diagrams, author-specific criteria, interview notices and guardrail list. Private extraction and contact sheets remain outside the repository under the canonical project's `work/book-research` folder. No source PDF, source chart screenshot or complete extracted text is included in the public repository.

Physical PDF positions below are one-based. In the Arabic-numbered body the physical position is printed page + 14. Chapter 9 is explicitly verified as physical page 126 / printed page 112. Front matter uses different or absent folios; the map does not label front matter with invented Arabic pages. Blank body/index leaves retain a counted printed position in the map and are explicitly not claims that a folio is visible.

`book-source-map.json` records every physical page, chapter/topic, available printed number, lesson IDs and review limitations. Its source SHA-256 identifies the exact user-supplied edition. Chapter ranges derive from the contents and body headings, not from a different edition.

## Implemented coverage

| Lesson | Main material | Physical PDF pages | Printed pages |
|---|---|---|---|
| dt-01 | Expectations, uncertainty, effort and non-typical results | 6, 15-18, 62-63 | Important Notes unnumbered; 1-4, 48-49 |
| dt-02 | Learning from the author's records and experience | 20, 30-31, 35-36, 40, 42 | 6, 16-17, 21-22, 26, 28 |
| dt-03 | Workspace, simulator limitations and preparation | 72-77 | 58-63 |
| dt-04 | Equity/debt, shares, float, auctions and short direction | 78-90 | 64-76 |
| dt-05 | Discipline, planned loss acceptance and FOMO | 92, 94-99, 111-112, 137-138 | 78, 80-85, 97-98, 123-124 |
| dt-06 | Explicit reward:risk, win rate, limits and drawdown | 100-104, 109-111, 118-121 | 86-90, 95-97, 104-107 |
| dt-07 | OHLC, bodies/wicks, timeframes and unfinished candles | 126-128 | 112-114 |
| dt-08 | Doji, tails, hammers, long bodies and context | 128-133 | 114-119 |
| dt-09 | Author-specific screening criteria and stock context | 36-38, 134-143, 202-203 | 22-24, 120-129, 188-189 |
| dt-10 | Simulator practice, journals, adherence and review | 144-148, 150-157 | 130-134, 136-143 |
| dt-11 | Graham/Martin process lessons, not typical outcomes | 158, 162, 165, 168, 170, 175, 177, 181, 183-185, 187 | 144, 148, 151, 154, 156, 161, 163, 167, 169-171, 173 |
| dt-12 | Guardrails and an explicitly original checklist | 202-203, 144, 146-147, 154-155 | 188-189, 130, 132-133, 140-141 |

There are 12 lessons, 12 explicit numeric practical exercises, 36 knowledge checks with explanations for each option, 35 original glossary definitions and three original synthetic diagram configurations. Every lesson has objective, estimated minutes, original explanation, definitions, worked example, beginner mistake, recap and verified source references. Completion remains an explicit UI action controlled by the application, not by content loading.

## Attribution and limitations

- The track primarily concerns stock day trading. It does not convert stock patterns into options recommendations or certify readiness for profitable real-money trading.
- All worked examples, numerical exercises and diagram prices are original hypotheticals. No historical OHLC has been inferred from source screenshots. Diagrams are labeled synthetic.
- Screening numbers in dt-09 are explicitly Cameron's 2023 preferences. The guardrail list favors prices generally $2-$10, not above $20; Chapter 10 describes a $2-$20 focus with exceptions. The track preserves that difference instead of treating either as a universal requirement.
- The book's `profit/loss` 2:1 is expressed explicitly as **reward:risk** 2:1 in this track. It is not an instruction to risk twice the reward. The numeric break-even discussion states assumptions and excludes costs; live fills and targets are not guaranteed.
- Physical page 131 uses `inverted hammer` in an uptrend context. The track explains the conventional distinction: a small body with a long upper wick after an advance is commonly called a shooting star, while inverted hammer usually refers to that shape after a decline. Supplement: [StockCharts ChartSchool, Introduction to Candlesticks](https://chartschool.stockcharts.com/table-of-contents/chart-analysis/candlestick-charts/introduction-to-candlesticks). Shape, context and uncertainty are stated explicitly; no reversal is promised.
- Conceptual short-sale mechanics and theoretically unlimited loss were checked against [SEC, Key Points About Regulation SHO](https://www.sec.gov/investor/pubs/regsho.htm). The SEC page contains historical settlement language; that language is not used. No current settlement period, broker pricing/platform availability, tick-size, PDT, margin eligibility or account rule has been added from the 2023 book.
- Graham and Martin are the privacy names used in the source. The track retains the source's non-typical-results context and focuses on behavior rather than promotional achievements or income amounts.
- Promotional front/back matter, detailed biography, specific brokerage/tool endorsements, index content and most financial-success anecdotes are not reproduced. The book's chart-pattern references are not used to falsely attribute the separate chart-guide question bank to Cameron's book.
- Some text extraction contains encoding replacement characters. Any affected source terminology used in lessons was checked against rendered pages; exact corrupted strings are not republished. No uncertain chart price or indicator has been assigned to the author.

## Content contract

`dist/daytrade-content.js` exports `dayLessons` and `glossary`. Lesson IDs `dt-01` through `dt-12` are stable. Knowledge checks use stable option IDs and an `answer` option ID so UI choice shuffling can preserve grading. Numeric exercise tolerance is ±0.01 in the displayed units; the UI must reject blank/non-finite input. Supplemental web sources are labeled separately from the book references. Previous/next navigation, filtered practice links, persistence and completion gating belong to the learning UI and are tested by the owning implementation.
