# Acquisition & Sales Roadmap — Las Vegas Under-Serviced Dropship Play

*Companion to `reports/vegas-dropship-report.md` (run `python3 -m vegas_dropship report` to regenerate).
Numbers reference the tool's channel models; re-verify quotes before committing capital.*

## The thesis in one paragraph

Trending products' dominant sellers make Las Vegas buyers wait 8–25 days (China dropship),
while the purchases themselves are deadline-driven: a pool party this Saturday, EDC in three
weeks, a bachelorette tonight, 110°F heat right now. Whoever holds the right 15–20 SKUs
*inside* the Vegas valley wins those sales at healthy margins. The roadmap validates demand
with zero-inventory dropshipping, then moves winners into local inventory (Vegas 3PL + Amazon
FBA) to collapse delivery from weeks to same-day.

## Phase 0 — Foundation (Weeks 1–2, ~$800)

| Item | Action | Cost |
|------|--------|-----:|
| Entity & tax | NV LLC (~$425 first year incl. state business license) + Nevada sales tax permit | ~$450 |
| Storefront | Shopify Basic ($39/mo, or $29 annual), domain, theme | ~$60 |
| Ad accounts | Meta + TikTok pixels installed, warmed with $5–10/day engagement | ~$100 |
| Samples | Order all top-6 SKUs from 2 suppliers each via AliExpress/CJ for QC | ~$200 |

**Exit criteria:** store live, pixels firing, samples in hand and photographed.

## Phase 1 — Validate with dropshipping (Weeks 2–8, cap $2,500 ad spend)

Launch 3–4 of the report's top 6 (start with **neck fan, misting fan, bachelorette kit,
hydration pack** — pool float's bulk makes it a Phase 2 add; poker set is capital-heavy):

- Fulfill via **CJ US-warehouse stock where it exists, China otherwise** — quote honest
  delivery dates on the product page; this phase buys *data*, not reputation.
- Creative angle = the Vegas hook (heat, pool, EDC countdown, "Vegas bachelorette starter kit").
- Budget **$500–750 ad spend per SKU**, then apply kill/keep gates:

| Gate (per SKU) | Keep | Kill |
|----------------|------|------|
| Orders in test window | ≥ 40 | < 25 |
| Blended CAC | ≤ product's modeled CAC (data/products.json) | > 1.5× model |
| Store conversion rate | ≥ 1.5% | < 0.8% |
| Refund/chargeback | < 5% | > 8% |

**Expected P&L at this stage** (China dropship, 100 orders/mo/SKU): roughly break-even to
+$900/SKU/mo per the tool — treat profit as a bonus; the deliverable is a validated winner list.

## Phase 2 — Bulk import winners into a Vegas 3PL (Months 2–4, ~$3–6K capital)

For each validated winner:

1. **RFQ on Alibaba** (3 factories, ask: unit price @ 300/1000, lead time, defect policy).
   Target landed cost ≤ `cogs_bulk + freight_in` in `data/products.json`.
2. **Pre-shipment QC inspection** (~$150–300/order — non-negotiable after dropship-grade QC).
3. **First batch 300 units by air freight** (5–10 days) to start the clock fast; restock by sea
   (20–35 days) once velocity is known.
4. **Contract a Vegas 3PL** — get quotes from Your Logistics (N. Las Vegas), Black Mountain
   (advertises same-day), Red Stag LV (heavy/bulky), ShipNetwork LV. Model assumes
   $3.25 pick/pack + $4.75 local ship + $250/mo minimum; negotiate same-day cutoff (ideally 2pm)
   and Strip-hotel courier coverage.
5. **Relaunch pages around speed**: "Order by 2pm — at your pool tonight." Same-day delivery to
   Strip hotels is the wedge nobody dropshipping from Shenzhen can copy.

**Capital math per SKU (from the tool, 300 units):** pool float $2,880 → payback ~1.5 mo,
12-mo ROI ~680%; misting fan ~$1,110; bachelorette kit ~$1,650. Fund 2–3 SKUs, not all six.

## Phase 3 — Add Amazon FBA (Months 3–6)

- Split the second production batch ~50/50: half to the Vegas 3PL (Shopify + same-day), half
  into FBA (LAS-area receiving is nearby; SNV1 gives same-day Prime locally).
- FBA models the **highest contribution margin** of all four channels for most top SKUs
  (~25–30%) because marketplace intent traffic replaces cold-social CAC — accept the trade:
  15% referral + fulfillment fee + 3.5% fuel surcharge + clone risk.
- Listing angle: own the local keywords ("EDC hydration pack," "Vegas pool float same day,"
  "bachelorette kit Las Vegas") plus the national trend terms.
- Keep both: **FBA harvests demand that already exists; Shopify + 3PL owns the customer,
  the same-day wedge, and B2B.**

## Phase 4 — Scale & moats (Months 6–12)

- **Seasonal calendar:** stock up Feb–Mar for pool season; April for EDC (May 15-ish);
  Sep–Oct wedding peak; Nov for NFR (Dec) and NYE glow/LED.
- **B2B channel:** hotel concierges, event planners, party-house Airbnb hosts, dayclub cabana
  services — case quantities, net-15, same-day courier. This is margin-rich and ad-free.
- **Private label** the 1–2 proven SKUs (logo, packaging, bundle inserts) to defend margin.
- **Bundles** lift AOV past CAC: fan + cooling towel; bachelorette kit + veil + LED set;
  hydration pack + electrolyte sticks.
- **Geographic replication** only after Vegas P&L is stable: Phoenix and Palm Springs share
  the heat/pool profile via the same 3PL network.

## KPI targets (steady state)

| Metric | Target | Source |
|--------|--------|--------|
| Blended net margin | 15–25% | 2026 dropship benchmark (healthy = 15–25%) |
| Contribution margin (3PL/FBA channels) | ≥ 20% | tool output, top SKUs |
| Inventory turns | ≥ 6×/yr (seasonal SKUs ≥ 8× in season) | standard |
| Same-day order share (Shopify) | ≥ 25% by Month 6 | the wedge working |
| Payback per SKU batch | ≤ 2 months | tool: 1.0–1.5 mo modeled |

## Top risks & mitigations

1. **Inventory risk on seasonal SKUs** (floats worthless in November) → buy to sell-through by
   Sep 1; clearance via bundle/B2B; never sea-freight a first order.
2. **2025 visitation softness (−7.5%)** → weight resident-facing SKUs (pet, pool, golf) equally
   with tourist SKUs; conventions held ~6M and EDC set records — event demand is intact.
3. **Amazon clone compression** on viral gadgets → treat trend SKUs as 1–2 quarter trades;
   moat = local same-day + B2B, not the SKU itself.
4. **Tariff/duty shifts on China imports** → quote DDP where possible; keep 20% cost buffer;
   qualify one US/Mexico backup supplier per category.
5. **3PL quote ≠ model assumptions** → the tool's 3PL rates are planning figures; re-run
   `python3 -m vegas_dropship roi --product <id>` with updated `data/market.json` after quotes.
6. **Battery/compliance (neck fans, LED)** → require UN38.3/MSDS docs from the factory;
   air-freight restrictions apply to lithium.
