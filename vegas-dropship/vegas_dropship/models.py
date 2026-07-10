"""Dataclasses for the Vegas dropship opportunity analyzer."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Product:
    id: str
    name: str
    category: str
    retail_price: float
    cogs_china: float
    cogs_bulk: float
    cogs_us_dropship: float
    freight_in_per_unit: float
    unit_weight_lb: float
    size_tier: str
    dropship_ship_china: float
    dropship_ship_us: float
    amazon_referral_pct: float
    returns_rate: float
    cac: float
    amazon_ad_pct: float
    demand_score: float
    demand_rationale: str
    vegas_fit: float
    vegas_rationale: str
    dominant_offer_delivery_days: tuple[float, float]
    delivery_rationale: str
    seasonality: str
    risk_notes: str
    supplier_ids: list[str] = field(default_factory=list)
    sources: list[str] = field(default_factory=list)

    @property
    def delivery_midpoint(self) -> float:
        lo, hi = self.dominant_offer_delivery_days
        return (lo + hi) / 2.0


@dataclass
class Supplier:
    id: str
    name: str
    type: str
    origin: str
    ship_to_vegas_days: tuple[float, float]
    moq: int
    cost_profile: str
    best_for: str
    risks: str
    url: str
    sources: list[str] = field(default_factory=list)


@dataclass
class ScoreBreakdown:
    product_id: str
    demand: float          # 0-100
    underservice: float    # 0-100
    vegas: float           # 0-100
    margin: float          # 0-100
    opportunity: float     # 0-100 weighted composite

    def as_row(self) -> dict:
        return {
            "product_id": self.product_id,
            "demand": round(self.demand, 1),
            "underservice": round(self.underservice, 1),
            "vegas": round(self.vegas, 1),
            "margin": round(self.margin, 1),
            "opportunity": round(self.opportunity, 1),
        }


@dataclass
class ChannelResult:
    channel: str
    label: str
    delivery_days: tuple[float, float]
    revenue_per_unit: float          # net of returns
    variable_cost_per_unit: float
    contribution_per_unit: float
    contribution_margin_pct: float   # vs gross price
    fixed_monthly: float
    upfront_capital: float
    monthly_profit: dict[int, float] = field(default_factory=dict)  # volume -> $
    payback_months: float | None = None
    roi_12mo_pct: float | None = None
    cost_detail: dict[str, float] = field(default_factory=dict)
