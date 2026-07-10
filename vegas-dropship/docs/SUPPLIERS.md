# Supplier & Fulfillment Directory

*Machine-readable version: `data/suppliers.json` (drives the tool). Per-product matches:
`python3 -m vegas_dropship suppliers --product <id>`. 3PL rates are industry-typical planning
figures — Vegas 3PLs quote privately; confirm everything below before contracting.*

## Stage 1 — Validation (no inventory)

| Supplier | Ships to Vegas | Role | Watch out |
|----------|----------------|------|-----------|
| **AliExpress** (direct) | 8–20 days | Samples + first live tests at lowest unit cost | 15–30 day worst case; CNY/Golden Week blackouts add 1–2 weeks |
| **CJ Dropshipping** | China 7–22d / **US warehouse 2–7d** | Main validation platform; some SKUs already stocked stateside | Only a fraction of catalog is US-stocked — filter "US Warehouse" explicitly |
| **Zendrop** | China 10–15 business days / **US 3–5 business days** | Shopify-native automation | US estimate only valid when the SKU is actually in their US stock |
| **Spocket** | 3–7 days (US/EU network) | US-origin pet/golf/wellness variants | $39–99/mo; thin on viral SKUs; tighter margins |
| **Printify / Printful** | 4–8 days (print + ship) | Personalized bachelorette/golf/pet SKUs — personalization was 2026's strongest demand signal | 2–4 day production lag; POD margins |

## Stage 2 — Bulk acquisition

| Supplier | Terms | Role |
|----------|-------|------|
| **Alibaba** (factory direct) | MOQ ~200–500; sea 20–35d or air 5–10d to Vegas | The bulk buy that powers the local-inventory play; target `cogs_bulk` in `data/products.json` |

**RFQ checklist (send to 3 factories per SKU):** unit price @ 300 / 1000 units · production
lead time · DDP vs FOB quote (prefer DDP to a Vegas 3PL) · defect rate & replacement policy ·
certifications (UN38.3/MSDS for anything with a battery; CPSIA if child-adjacent) · sample cost
credited against first PO. **Always** buy a pre-shipment inspection ($150–300).

## Stage 3 — Las Vegas fulfillment (the moat)

| 3PL | Location | Angle |
|-----|----------|-------|
| **Your Logistics Corp** | North Las Vegas | West-coast eCommerce focus, Amazon prep, returns |
| **Black Mountain Fulfillment** | Las Vegas | Advertises same-day fulfillment — key for the wedge |
| **Red Stag Fulfillment** | Las Vegas | Heavy/bulky specialists (poker sets, floats), accuracy SLAs |
| **ShipNetwork** | Las Vegas | National network — scale beyond Vegas from the same node |
| **Amazon FBA** | LAS2/LAS6/LAS7 + SNV1 same-day | Prime capture once a SKU is proven |

**3PL vetting questions:** same-day cutoff time (want ≥ 2pm) · courier coverage of Strip
hotels/residential valley · pick/pack rate + per-additional-item · storage per pallet/bin/mo ·
monthly minimum · receiving fee per pallet · returns processing fee · WMS/Shopify integration ·
peak-season (Oct–Dec) surcharges · insurance.

## Per-product supplier map (from the catalog)

| Product | Validate via | Bulk via | Fulfill via |
|---------|--------------|----------|-------------|
| Pool float | CJ / AliExpress | Alibaba | Red Stag LV (bulky) or Black Mountain |
| Neck fan | CJ / Zendrop | Alibaba (UN38.3 docs) | Any LV 3PL + FBA |
| Misting fan | CJ / Zendrop | Alibaba | Any LV 3PL + FBA |
| Bachelorette kit | CJ / AliExpress + Printify (personalized) | Alibaba | Black Mountain (same-day is the sale) |
| Hydration pack | CJ / Zendrop | Alibaba | Any LV 3PL + FBA |
| Poker set | Alibaba samples | Alibaba | Red Stag LV (heavy) + FBA |
| Cooling towel / golf kit / pet mat | CJ / Spocket | Alibaba | Any LV 3PL + FBA |

## Red flags (any stage)

- No pre-shipment inspection allowed → walk.
- "US warehouse" claims without a checkable US tracking origin on sample orders → treat as China timing.
- Battery products without UN38.3 test summaries → can't legally air-freight; customs seizure risk.
- Quotes only in EXW with vague freight → get DDP or use a freight forwarder you control.
