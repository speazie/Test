# Amazon vs Shopify for the Las Vegas Play (2026)

*Fee data: Amazon 2026 schedule (referral unchanged 8–15%; fulfillment +$0.08/unit avg from
2026-01-15; 3.5% fuel surcharge on fulfillment fees from 2026-04-17) and Shopify 2026 pricing
(Basic $39/mo, 2.9% + 30¢ with Shopify Payments). Sources at bottom.*

## Cost structure side by side

| Cost | Amazon (FBA) | Shopify (+ Vegas 3PL) |
|------|--------------|------------------------|
| Platform | $39.99/mo Professional | $39/mo Basic + ~$60/mo apps |
| Take rate on sale | Referral 15% most categories (8% consumer electronics) | Payment 2.9% + 30¢ |
| Fulfillment | Size-tier fee: ~$3.42 small-standard, $4.75–6.97 large-standard, ~$10+ bulky — **×1.035 fuel surcharge since Apr 17, 2026** | 3PL pick/pack ~$3.25 + $0.35 packaging + $4.75 local postage *(planning rates — quotes are private)* |
| Extra platform fees | Inbound placement $0.30–0.55/unit, monthly + aged storage, returns processing | Chargebacks $15, +1% international cards |
| Customer acquisition | Mostly organic/intent + PPC at ~9–12% of price (TACoS-style) | Cold social CAC $6–16/order on these SKUs |
| Inventory | Required (FBA warehouses) | Required for 3PL route; $0 for dropship routes |

## What the model says (top-6 SKUs, 300 units/mo)

| Route | Avg contribution margin | Delivery to Vegas buyer | Capital |
|-------|------------------------:|-------------------------|---------|
| Shopify + China dropship | ~19% | 10–20 days | $0 |
| Shopify + US-warehouse dropship | ~3% | 3–7 days | $0 |
| Shopify + Vegas 3PL | ~14% | 1–3 days (same-day possible) | ~$1–3K/SKU |
| Amazon FBA | ~29% | 1–2 days (same-day via SNV1) | ~$1–3K/SKU |

Example (oversized pool float, $39.99): FBA nets **$10.10/unit** after the full fee stack vs
**$7.43/unit** via Vegas 3PL — because Amazon's intent traffic (~$4.00 ads/unit modeled) costs
a third of cold-social CAC ($11). Run `python3 -m vegas_dropship roi --product <id>` for any SKU.

## Where Amazon wins

- **Demand already exists** — no cold-traffic tax; Prime badge converts.
- **Speed at zero marginal effort:** LAS2/6/7 + SNV1 give same-day/next-day in Vegas.
- **Best modeled margins** on most top SKUs despite the ~30–40% total fee stack.
- Scales nationally the moment a SKU works locally.

## Where Amazon loses

- **No customer relationship** (no email/SMS list, no retargeting, no bundles at checkout).
- **Clone compression:** viral gadgets attract copycats within 1–2 quarters; price wars erode
  the modeled margin. The Buy Box, not you, owns the demand.
- **Fee drift:** 2026 added a fuel surcharge mid-year with 90 days' notice — take rates only move up.
- **No same-day-to-hotel wedge:** you can't courier to a Strip concierge or sell B2B case
  quantities through a listing.
- Suspension/compliance risk concentrates the whole business in one account.

## Where Shopify wins

- **Owns the wedge:** "order by 2pm, at your pool tonight" via a Vegas 3PL courier — Amazon
  sellers dropshipping from China cannot follow, and Amazon itself doesn't stock the trend SKUs.
- **Owns the customer:** list building, bundles (fan + towel), B2B/event-planner accounts,
  repeat season buyers.
- **Zero-capital validation:** dropship routes test demand before any bulk buy — the whole
  Phase 1 of the roadmap runs here.
- Brand equity and margin control (private label later).

## Where Shopify loses

- **You buy every visitor.** Cold CAC $6–16 makes US-warehouse dropshipping (~3% margin)
  structurally unprofitable; even the 3PL route trails FBA margin on most SKUs.
- Conversion trust gap vs Prime; chargebacks are yours to fight ($15 each).
- App stack + theme + ops overhead is real work.

## Verdict: sequence, don't choose

1. **Validate on Shopify** (dropship, $0 inventory) — Amazon is a terrible test bench: listings
   need inventory, reviews, and fees up front.
2. **Bulk-import winners to a Vegas 3PL, keep selling on Shopify** — this owns the same-day
   local wedge, B2B, and the customer list.
3. **Add FBA for the same SKUs** — harvest national/marketplace demand at the model's best
   margins, using Shopify data to pick only proven winners (which de-risks the FBA fee stack
   and inventory commitment).
4. **Rebalance quarterly:** trend SKUs fading to clone pressure → run down FBA stock, keep the
   Vegas-moat SKUs (event/party/heat) on both rails.

Decision rule per SKU: **FBA when demand is search-shaped** (people already type it into
Amazon) **; Shopify+3PL when demand is moment-shaped** (a deadline in Vegas creates the buyer).
The top-6 list contains both — that's why the roadmap runs both rails.

## Sources

- <https://sellingpartners.aboutamazon.com/update-to-u-s-referral-and-fulfillment-by-amazon-fees-for-2026>
- <https://sellercentral.amazon.com/help/hub/reference/external/G201411300>
- <https://amzprep.com/amazon-fba-fees/>
- <https://novadata.io/resources/blog/2026-amazon-fba-fee-changes>
- <https://www.shopify.com/pricing>
- <https://help.shopify.com/en/manual/intro-to-shopify/pricing-plans/pricing-overview>
- <https://taxomate.com/blog/shopify-fees>
- <https://www.reviewjournal.com/business/how-a-unique-las-vegas-facility-allows-amazon-to-make-same-day-deliveries-2690555/>
- <https://trueprofit.io/blog/dropshipping-profit-margin>
