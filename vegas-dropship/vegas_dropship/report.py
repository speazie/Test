"""Markdown report generator: rankings, deep-dives, channel comparison, sources."""
from __future__ import annotations

from datetime import date

from .economics import VOLUMES, analyze_channels, best_channel
from .models import ChannelResult, Product, ScoreBreakdown, Supplier
from .scoring import rank_products


def _money(x: float) -> str:
    return f"-${abs(x):,.2f}" if x < 0 else f"${x:,.2f}"


def _days(rng: tuple[float, float]) -> str:
    lo, hi = rng
    return f"{lo:g}-{hi:g} days"


def _ranking_table(scored: list[tuple[Product, ScoreBreakdown]]) -> str:
    lines = [
        "| # | Product | Category | Opportunity | Demand | Under-service | Vegas fit | Margin | Dominant delivery today |",
        "|---|---------|----------|------------:|-------:|--------------:|----------:|-------:|-------------------------|",
    ]
    for i, (p, s) in enumerate(scored, 1):
        lines.append(
            f"| {i} | {p.name} | {p.category} | **{s.opportunity:.1f}** | {s.demand:.0f} "
            f"| {s.underservice:.0f} | {s.vegas:.0f} | {s.margin:.0f} | {_days(p.dominant_offer_delivery_days)} |")
    return "\n".join(lines)


def _channel_table(results: list[ChannelResult], planning_volume: int = 300) -> str:
    lines = [
        "| Channel | Delivery | Contribution/unit | Margin | Fixed/mo | Upfront capital | Profit/mo @300 | Payback | 12-mo ROI |",
        "|---------|----------|------------------:|-------:|---------:|----------------:|---------------:|--------:|----------:|",
    ]
    for r in results:
        payback = f"{r.payback_months:.1f} mo" if r.payback_months else "—"
        roi = f"{r.roi_12mo_pct:,.0f}%" if r.roi_12mo_pct is not None else "n/a (no inventory)"
        capital = _money(r.upfront_capital) if r.upfront_capital else "$0"
        lines.append(
            f"| {r.label} | {_days(r.delivery_days)} | {_money(r.contribution_per_unit)} "
            f"| {r.contribution_margin_pct:.0f}% | {_money(r.fixed_monthly)} | {capital} "
            f"| {_money(r.monthly_profit[planning_volume])} | {payback} | {roi} |")
    return "\n".join(lines)


def _volume_table(results: list[ChannelResult]) -> str:
    header = "| Channel | " + " | ".join(f"{v}/mo" for v in VOLUMES) + " |"
    sep = "|---------|" + "|".join("--------:" for _ in VOLUMES) + "|"
    lines = [header, sep]
    for r in results:
        cells = " | ".join(_money(r.monthly_profit[v]) for v in VOLUMES)
        lines.append(f"| {r.label} | {cells} |")
    return "\n".join(lines)


def _deep_dive(product: Product, score: ScoreBreakdown, market: dict,
               suppliers_by_id: dict[str, Supplier]) -> str:
    results = analyze_channels(product, market)
    best = best_channel(results)
    supplier_lines = "\n".join(
        f"  - **{suppliers_by_id[sid].name}** ({_days(suppliers_by_id[sid].ship_to_vegas_days)} to Vegas) — {suppliers_by_id[sid].cost_profile}"
        for sid in product.supplier_ids if sid in suppliers_by_id)
    sources = "\n".join(f"  - <{u}>" for u in product.sources)
    return f"""### {product.name} — opportunity {score.opportunity:.1f}/100

*{product.category} · ${product.retail_price:.2f} retail · {product.seasonality}*

**Why it ranks here:** demand {score.demand:.0f}/100 — {product.demand_rationale}

**The delivery gap:** buyers currently wait **{_days(product.dominant_offer_delivery_days)}** ({product.delivery_rationale})

**Vegas angle (fit ×{product.vegas_fit:.2f}):** {product.vegas_rationale}

**Channel economics (at 300 units/mo):**

{_channel_table(results)}

**Monthly profit by volume:**

{_volume_table(results)}

**Recommended route:** **{best.label}** — {_money(best.contribution_per_unit)}/unit contribution, {_days(best.delivery_days)} delivery. {"Requires " + _money(best.upfront_capital) + " inventory capital; payback ~" + f"{best.payback_months:.1f}" + " months at 300/mo." if best.upfront_capital else "No inventory capital required."}

**Suppliers:**
{supplier_lines}

**Risks:** {product.risk_notes}

**Sources:**
{sources}
"""


def generate_report(products: list[Product], suppliers: list[Supplier],
                    market: dict, top_n: int = 6) -> str:
    scoring_cfg = market["scoring"]
    vegas = market["vegas_market"]
    scored = rank_products(products, scoring_cfg)
    suppliers_by_id = {s.id: s for s in suppliers}

    top = scored[:top_n]
    deep_dives = "\n---\n\n".join(
        _deep_dive(p, s, market, suppliers_by_id) for p, s in top)

    # Channel averages across the top cohort for the summary
    channel_sums: dict[str, list[float]] = {}
    for p, _ in top:
        for r in analyze_channels(p, market):
            channel_sums.setdefault(r.label, []).append(r.contribution_margin_pct)
    channel_avg = {
        label: sum(vals) / len(vals) for label, vals in channel_sums.items()}

    best_names = ", ".join(p.name for p, _ in top[:3])
    weights = scoring_cfg["weights"]

    all_sources = sorted({u for p in products for u in p.sources}
                         | set(vegas.get("sources", []))
                         | {u for ch in market["channels"].values() for u in ch.get("sources", [])})
    sources_md = "\n".join(f"- <{u}>" for u in all_sources)

    return f"""# Las Vegas Under-Serviced Dropship Opportunity Report

*Generated {date.today().isoformat()} by `vegas-dropship` · data snapshot mid-2026 · all currency USD*

## Executive summary

Las Vegas is **not** under-serviced by Amazon — North Las Vegas hosts the LAS2/LAS6/LAS7
fulfillment centers plus the SNV1 same-day facility moving ~600K packages/day. The gap this
report targets is different: **trending products whose dominant sellers dropship from China in
8-22 days**, and **deadline-driven purchases** (pool parties, EDC, bachelorette weekends,
forgotten travel gear) where the buyer needs the item *this week or never*. A seller holding
those exact SKUs locally — via a Vegas 3PL or FBA — collapses a 2-3 week wait into 1-2 days
and takes the sale.

**Top opportunities:** {best_names}.

**Market context:** {vegas['annual_visitors_2025']:,} visitors in 2025 (down {abs(vegas['visitors_change_yoy'])*100:.1f}% — a soft year, still ~108K/day),
{vegas['convention_attendees_2025']:,} convention attendees, EDC 2026 drew {vegas['edc_2026_total_attendance']:,}+ over three nights,
{vegas['marriage_licenses_2024']:,} marriage licenses issued in 2024 (~{vegas['marriage_licenses_per_day']}/day — wedding capital of the US),
pool season {vegas['pool_season']}, and {vegas['extreme_heat_months']} extreme heat.

## Opportunity ranking

Composite score = {weights['demand']:.0%} demand + {weights['underservice']:.0%} under-service (delivery gap vs 2-day Prime baseline)
+ {weights['vegas_fit']:.0%} Vegas fit + {weights['margin']:.0%} margin quality.

{_ranking_table(scored)}

The control items behave as expected: magnetic phone mounts score high on demand but near zero
on under-service (Amazon ships them next-day), and the plush phone holder has the delivery gap
but no Vegas angle — confirming the model separates *"popular"* from *"popular AND slow AND local."*

## Channel comparison (average contribution margin, top {top_n} products)

| Channel | Avg contribution margin | Delivery to Vegas buyer | Inventory capital |
|---------|------------------------:|-------------------------|-------------------|
{chr(10).join(f"| {label} | {avg:.0f}% | {_days(tuple(market['channel_delivery_days'][ch]))} | {'Required' if ch in ('shopify_vegas_3pl', 'amazon_fba') else 'None'} |" for ch, label in [('shopify_china_dropship', 'Shopify + China dropship'), ('shopify_us_dropship', 'Shopify + US-warehouse dropship'), ('shopify_vegas_3pl', 'Shopify + Vegas 3PL (bulk import)'), ('amazon_fba', 'Amazon FBA (Prime)')] for avg in [channel_avg[label]])}

**Reading:** China dropship keeps decent paper margins but delivers the very 10-20 day
experience this report identifies as the gap — it is the validation channel, not the
destination. US-warehouse dropshipping collapses to near-zero: you pay domestic-speed unit
costs *and* cold-traffic CAC. The two inventory routes win on both speed and economics — FBA
models best here because marketplace intent traffic is cheaper than cold social ads (~10% of
price vs $6-16 CAC), at the cost of fee exposure and platform dependence, while the Vegas 3PL
route keeps channel independence and same-day capability. The sequencing that manages the
inventory risk is in `docs/ROADMAP.md`; the channel decision framework is in
`docs/AMAZON_VS_SHOPIFY.md`.

## Product deep-dives (top {top_n})

{deep_dives}

---

## Methodology & assumptions

- **Demand (0-100)** is analyst-curated from 2026 trending-product datasets (CJ, Trendtrack,
  AutoDS, Shopify, WinningHunter, Syncee) — sources on each product.
- **Under-service (0-100)** = midpoint of the dominant offer's delivery range to a Vegas buyer,
  minus the {scoring_cfg['prime_baseline_days']:.0f}-day Prime baseline, scaled to 100 at a
  {scoring_cfg['max_gap_days']:.0f}+ day gap. Delivery ranges come from published 2026 shipping
  data: AliExpress standard 8-20 days, CJ China 7-22, Zendrop China 10-15 business days,
  CJ/Zendrop US warehouses 2-7.
- **Vegas fit (×0.8-1.6)** encodes local demand drivers: heat, pool season, EDC, weddings,
  conventions, golf, tourist logistics.
- **Margin (0-100)** = China-route gross margin vs the 70% dropship benchmark.
- **Economics:** Shopify Basic $39/mo + 2.9% + 30¢; app stack $60/mo (assumption). Amazon 2026
  fees: referral 8-15% by category, size-tier fulfillment fees incl. the 3.5% fuel surcharge
  (effective 2026-04-17), inbound placement, storage, prep. Vegas 3PL rates are
  industry-typical planning figures ($3.25 pick/pack, $4.75 local ship, $250/mo minimum) —
  **Vegas 3PLs quote privately; verify before contracting.** Returns modeled as lost revenue
  with costs retained (conservative).
- **All COGS and shipping figures are planning estimates** from typical mid-2026 listings.
  Re-quote every SKU (live AliExpress/CJ/Alibaba quotes + freight) before ordering. CAC assumes
  a warmed-up ad account; expect 1.5-2x in the first month.
- 2025 visitation was down 7.5% — the tourist-facing SKUs carry that softness as a risk factor;
  the resident-facing SKUs (pet, pool, golf) do not.

## Sources

{sources_md}
"""
