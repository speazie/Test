"""Under-service opportunity scoring.

opportunity = w_demand * demand + w_underservice * underservice
            + w_vegas * vegas_fit + w_margin * margin        (all 0-100)

- demand: analyst-curated national demand score (0-100, cited in data).
- underservice: how far the dominant offer's delivery time to a Las Vegas
  buyer exceeds the 2-day Prime baseline, scaled so a gap of
  `max_gap_days` (18) or more = 100. This is the core "long delivery
  time" signal the tool ranks on.
- vegas_fit: the 0.8-1.6 local-relevance multiplier mapped onto 0-100.
- margin: gross margin of the cheapest viable route (China dropship)
  relative to the 70% dropship benchmark, capped at 100.
"""
from __future__ import annotations

from .models import Product, ScoreBreakdown


def underservice_score(product: Product, baseline_days: float, max_gap_days: float) -> float:
    gap = product.delivery_midpoint - baseline_days
    if gap <= 0:
        return 0.0
    return min(gap / max_gap_days, 1.0) * 100.0


def vegas_score(product: Product, fit_range: tuple[float, float]) -> float:
    lo, hi = fit_range
    clamped = min(max(product.vegas_fit, lo), hi)
    return (clamped - lo) / (hi - lo) * 100.0


def margin_score(product: Product, benchmark: float) -> float:
    landed = product.cogs_china + product.dropship_ship_china
    gross_margin = (product.retail_price - landed) / product.retail_price
    if gross_margin <= 0:
        return 0.0
    return min(gross_margin / benchmark, 1.0) * 100.0


def score_product(product: Product, scoring_cfg: dict) -> ScoreBreakdown:
    weights = scoring_cfg["weights"]
    total_w = sum(weights.values())
    if abs(total_w - 1.0) > 1e-9:
        raise ValueError(f"scoring weights must sum to 1.0, got {total_w}")

    demand = min(max(product.demand_score, 0.0), 100.0)
    under = underservice_score(
        product, scoring_cfg["prime_baseline_days"], scoring_cfg["max_gap_days"])
    vegas = vegas_score(product, tuple(scoring_cfg["vegas_fit_range"]))
    margin = margin_score(product, scoring_cfg["gross_margin_benchmark"])

    opportunity = (
        weights["demand"] * demand
        + weights["underservice"] * under
        + weights["vegas_fit"] * vegas
        + weights["margin"] * margin
    )
    return ScoreBreakdown(
        product_id=product.id,
        demand=demand,
        underservice=under,
        vegas=vegas,
        margin=margin,
        opportunity=opportunity,
    )


def rank_products(products: list[Product], scoring_cfg: dict) -> list[tuple[Product, ScoreBreakdown]]:
    scored = [(p, score_product(p, scoring_cfg)) for p in products]
    scored.sort(key=lambda pair: pair[1].opportunity, reverse=True)
    return scored
