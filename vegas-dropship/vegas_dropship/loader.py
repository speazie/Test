"""Load and validate the curated JSON datasets."""
from __future__ import annotations

import json
from pathlib import Path

from .models import Product, Supplier

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

_PRODUCT_REQUIRED = {
    "id", "name", "category", "retail_price", "cogs_china", "cogs_bulk",
    "cogs_us_dropship", "freight_in_per_unit", "unit_weight_lb", "size_tier",
    "dropship_ship_china", "dropship_ship_us", "amazon_referral_pct",
    "returns_rate", "cac", "amazon_ad_pct", "demand_score", "demand_rationale",
    "vegas_fit", "vegas_rationale", "dominant_offer_delivery_days",
    "delivery_rationale", "seasonality", "risk_notes", "supplier_ids", "sources",
}

VALID_SIZE_TIERS = {"small_standard", "large_standard", "large_bulky"}


def _read_json(name: str, data_dir: Path | None = None) -> dict:
    path = (data_dir or DATA_DIR) / name
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_products(data_dir: Path | None = None) -> list[Product]:
    raw = _read_json("products.json", data_dir)
    products = []
    for entry in raw["products"]:
        missing = _PRODUCT_REQUIRED - set(entry)
        if missing:
            raise ValueError(f"product {entry.get('id', '?')} missing fields: {sorted(missing)}")
        if entry["size_tier"] not in VALID_SIZE_TIERS:
            raise ValueError(f"product {entry['id']} has invalid size_tier {entry['size_tier']!r}")
        lo, hi = entry["dominant_offer_delivery_days"]
        if not (0 < lo <= hi):
            raise ValueError(f"product {entry['id']} has invalid delivery range [{lo}, {hi}]")
        products.append(Product(**{**entry, "dominant_offer_delivery_days": (float(lo), float(hi))}))
    return products


def load_suppliers(data_dir: Path | None = None) -> list[Supplier]:
    raw = _read_json("suppliers.json", data_dir)
    suppliers = []
    for entry in raw["suppliers"]:
        known = {k: v for k, v in entry.items()
                 if k in Supplier.__dataclass_fields__}
        known.setdefault("best_for", "")
        known.setdefault("risks", "")
        lo, hi = known["ship_to_vegas_days"]
        known["ship_to_vegas_days"] = (float(lo), float(hi))
        suppliers.append(Supplier(**known))
    return suppliers


def load_market(data_dir: Path | None = None) -> dict:
    return _read_json("market.json", data_dir)


def validate_references(products: list[Product], suppliers: list[Supplier]) -> None:
    supplier_ids = {s.id for s in suppliers}
    for p in products:
        unknown = set(p.supplier_ids) - supplier_ids
        if unknown:
            raise ValueError(f"product {p.id} references unknown suppliers: {sorted(unknown)}")
