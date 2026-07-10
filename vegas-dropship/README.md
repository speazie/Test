# vegas-dropship

A research tool that ranks **popular dropship products by how under-serviced they are in the
Las Vegas market** (long delivery times vs local demand), models the economics of four
acquisition/sales routes (**Amazon FBA vs three Shopify variants**), matches products to
suppliers, and generates a full markdown opportunity report.

Pure Python 3 standard library — no dependencies.

## Quick start

```bash
cd vegas-dropship
python3 -m vegas_dropship analyze                      # ranked opportunity table
python3 -m vegas_dropship roi --product pool-float     # 4-channel unit economics for a SKU
python3 -m vegas_dropship suppliers --product neck-fan # supplier matches
python3 -m vegas_dropship report                       # writes reports/vegas-dropship-report.md
python3 -m unittest discover -s tests                  # 21 tests
```

(`PYTHONPATH=.` if you run from elsewhere.)

## What it produces

| Artifact | Contents |
|----------|----------|
| `reports/vegas-dropship-report.md` | Generated: exec summary, 15-product ranking, top-6 deep-dives with per-channel P&L/payback/ROI, channel comparison, methodology, sources |
| `docs/ROADMAP.md` | Phased acquisition & selling plan (validate → bulk import → Vegas 3PL → FBA → scale) with budgets, kill gates, KPIs, risks |
| `docs/AMAZON_VS_SHOPIFY.md` | 2026 fee stacks, computed margins, decision framework |
| `docs/SUPPLIERS.md` | Supplier directory, RFQ/vetting checklists, per-product map |

## How scoring works

`opportunity = 35% demand + 30% under-service + 20% Vegas fit + 15% margin` (weights in
`data/market.json`).

- **Demand** — curated 0–100 from 2026 trending-product datasets (sources on every product).
- **Under-service** — the core signal: midpoint of what a Vegas buyer waits today for the
  dominant offer (e.g. AliExpress standard 8–20 days, CJ China 7–22) minus the 2-day Prime
  baseline, scaled to 100 at an 18-day gap. Amazon-saturated items (phone mounts: 2–5 days)
  correctly score near zero.
- **Vegas fit** — ×0.8–1.6 multiplier for local drivers: 38.5M visitors, 110°F summers,
  pool season Mar–Oct, EDC (510K+ attendance), 76.8K marriage licenses/yr, 6M convention
  attendees, year-round golf.
- **Margin** — China-route gross margin vs the 70% dropship benchmark.

## Channel models (2026 fee schedules)

1. **Shopify + China dropship** — $0 capital, 10–20 day delivery (the gap itself; validation only)
2. **Shopify + US-warehouse dropship** — 3–7 days, margin usually collapses
3. **Shopify + Vegas 3PL** — bulk import, 1–3 days / same-day wedge, inventory capital + payback modeled
4. **Amazon FBA** — Prime 1–2 days, full 2026 fee stack (referral, size-tier fulfillment fee,
   3.5% fuel surcharge since Apr 17 2026, placement, storage, ads)

Each returns contribution/unit, margin %, monthly profit @ 100/300/1000 units, upfront capital,
payback months, and 12-month ROI.

## Editing the data

Everything the tool knows lives in three JSON files — no code changes needed to re-run with
fresh quotes:

- `data/products.json` — the candidate catalog (add SKUs, update COGS/delivery from live quotes)
- `data/suppliers.json` — supplier/3PL directory
- `data/market.json` — Vegas market signals, fee schedules, scoring weights

## Caveats

COGS, shipping, CAC, and 3PL rates are **planning estimates** curated mid-2026 from cited
public sources; Vegas 3PLs quote privately. Re-quote every number before committing capital.
This is analysis tooling, not financial advice.
