"""Channel economics: unit P&L, monthly profit, payback, and 12-month ROI.

Four routes to a Las Vegas customer are modeled per product:

1. shopify_china_dropship — Shopify store, supplier ships each order from
   China (AliExpress/CJ/Zendrop China stock). No inventory capital,
   slowest delivery (8-22 days).
2. shopify_us_dropship — Shopify store, US-warehouse dropship supplier
   (CJ US / Zendrop US / Spocket). No inventory capital, 3-7 days.
3. shopify_vegas_3pl — Bulk import (Alibaba MOQ) into a Las Vegas 3PL;
   1-3 day local delivery (same-day possible). Inventory capital at risk.
4. amazon_fba — Bulk import into FBA (LAS-area FCs); Prime 1-2 day,
   full 2026 fee stack including the 3.5% fuel surcharge.

Convention: revenue is net of returns (you refund the customer but have
already paid product, shipping, fees, and ads), which keeps the model
simple and slightly conservative.
"""
from __future__ import annotations

from .models import ChannelResult, Product

VOLUMES = (100, 300, 1000)

CHANNEL_LABELS = {
    "shopify_china_dropship": "Shopify + China dropship",
    "shopify_us_dropship": "Shopify + US-warehouse dropship",
    "shopify_vegas_3pl": "Shopify + Vegas 3PL (bulk import)",
    "amazon_fba": "Amazon FBA (Prime)",
}


def _fba_fulfillment_fee(product: Product, fba_cfg: dict, include_fuel_surcharge: bool = True) -> float:
    tiers = fba_cfg["fulfillment_fee_by_tier"]
    if product.size_tier == "small_standard":
        fee = tiers["small_standard"]
    elif product.size_tier == "large_bulky":
        fee = tiers["large_bulky"]
    else:  # large_standard, by weight band
        w = product.unit_weight_lb
        if w <= 1.0:
            fee = tiers["large_standard_1lb"]
        elif w <= 2.0:
            fee = tiers["large_standard_2lb"]
        else:
            fee = tiers["large_standard_3lb"]
    if include_fuel_surcharge:
        fee *= 1.0 + fba_cfg["fuel_surcharge_pct"]
    return fee


def _finalize(result: ChannelResult, volumes=VOLUMES, planning_volume: int = 300) -> ChannelResult:
    for v in volumes:
        result.monthly_profit[v] = result.contribution_per_unit * v - result.fixed_monthly
    planning_profit = result.monthly_profit.get(planning_volume, 0.0)
    if result.upfront_capital > 0 and planning_profit > 0:
        result.payback_months = result.upfront_capital / planning_profit
        result.roi_12mo_pct = (planning_profit * 12 - result.upfront_capital) / result.upfront_capital * 100
    return result


def shopify_dropship(product: Product, market: dict, us_warehouse: bool) -> ChannelResult:
    shop = market["channels"]["shopify_common"]
    price = product.retail_price
    if us_warehouse:
        cogs, ship = product.cogs_us_dropship, product.dropship_ship_us
        channel, delivery = "shopify_us_dropship", tuple(market["channel_delivery_days"]["shopify_us_dropship"])
    else:
        cogs, ship = product.cogs_china, product.dropship_ship_china
        channel, delivery = "shopify_china_dropship", tuple(market["channel_delivery_days"]["shopify_china_dropship"])

    payment = shop["payment_pct"] * price + shop["payment_fixed"]
    revenue = price * (1 - product.returns_rate)
    variable = cogs + ship + payment + product.cac
    contribution = revenue - variable
    return _finalize(ChannelResult(
        channel=channel,
        label=CHANNEL_LABELS[channel],
        delivery_days=delivery,
        revenue_per_unit=revenue,
        variable_cost_per_unit=variable,
        contribution_per_unit=contribution,
        contribution_margin_pct=contribution / price * 100,
        fixed_monthly=shop["plan_monthly"] + shop["apps_monthly"],
        upfront_capital=0.0,
        cost_detail={
            "product": cogs, "shipping": ship, "payment_fees": payment,
            "ads_cac": product.cac, "returns_allowance": price * product.returns_rate,
        },
    ))


def shopify_vegas_3pl(product: Product, market: dict) -> ChannelResult:
    shop = market["channels"]["shopify_common"]
    tpl = market["channels"]["vegas_3pl"]
    price = product.retail_price

    unit_product = product.cogs_bulk + product.freight_in_per_unit
    fulfillment = tpl["pick_pack_per_order"] + tpl["packaging_per_order"] + tpl["local_ship_per_order"]
    storage = tpl["storage_per_unit_month"]
    payment = shop["payment_pct"] * price + shop["payment_fixed"]
    revenue = price * (1 - product.returns_rate)
    variable = unit_product + fulfillment + storage + payment + product.cac
    contribution = revenue - variable

    first_buy = max(tpl["default_first_buy_units"], 0)
    return _finalize(ChannelResult(
        channel="shopify_vegas_3pl",
        label=CHANNEL_LABELS["shopify_vegas_3pl"],
        delivery_days=tuple(market["channel_delivery_days"]["shopify_vegas_3pl"]),
        revenue_per_unit=revenue,
        variable_cost_per_unit=variable,
        contribution_per_unit=contribution,
        contribution_margin_pct=contribution / price * 100,
        fixed_monthly=shop["plan_monthly"] + shop["apps_monthly"] + tpl["monthly_minimum"],
        upfront_capital=first_buy * unit_product,
        cost_detail={
            "product_landed": unit_product, "pick_pack_ship": fulfillment,
            "storage": storage, "payment_fees": payment, "ads_cac": product.cac,
            "returns_allowance": price * product.returns_rate,
        },
    ))


def amazon_fba(product: Product, market: dict) -> ChannelResult:
    fba = market["channels"]["amazon_fba"]
    price = product.retail_price

    unit_product = product.cogs_bulk + product.freight_in_per_unit + fba["prep_per_unit"]
    referral = product.amazon_referral_pct * price
    fulfillment = _fba_fulfillment_fee(product, fba)
    placement = (fba["inbound_placement_small"] if product.size_tier == "small_standard"
                 else fba["inbound_placement_large"])
    storage = fba["storage_per_unit_month"][product.size_tier]
    ads = product.amazon_ad_pct * price
    revenue = price * (1 - product.returns_rate)
    variable = unit_product + referral + fulfillment + placement + storage + ads
    contribution = revenue - variable

    first_buy = market["channels"]["vegas_3pl"]["default_first_buy_units"]
    return _finalize(ChannelResult(
        channel="amazon_fba",
        label=CHANNEL_LABELS["amazon_fba"],
        delivery_days=tuple(market["channel_delivery_days"]["amazon_fba"]),
        revenue_per_unit=revenue,
        variable_cost_per_unit=variable,
        contribution_per_unit=contribution,
        contribution_margin_pct=contribution / price * 100,
        fixed_monthly=fba["account_monthly"],
        upfront_capital=first_buy * unit_product,
        cost_detail={
            "product_landed_prepped": unit_product, "referral_fee": referral,
            "fba_fulfillment_incl_fuel": fulfillment, "inbound_placement": placement,
            "storage": storage, "ads": ads,
            "returns_allowance": price * product.returns_rate,
        },
    ))


def analyze_channels(product: Product, market: dict) -> list[ChannelResult]:
    return [
        shopify_dropship(product, market, us_warehouse=False),
        shopify_dropship(product, market, us_warehouse=True),
        shopify_vegas_3pl(product, market),
        amazon_fba(product, market),
    ]


def best_channel(results: list[ChannelResult], planning_volume: int = 300) -> ChannelResult:
    """Best = highest monthly profit at planning volume; ties break toward faster delivery."""
    return max(results, key=lambda r: (r.monthly_profit[planning_volume], -r.delivery_days[1]))
