"""CLI for the Vegas dropship opportunity analyzer.

Usage (from the vegas-dropship/ directory):
    python3 -m vegas_dropship analyze
    python3 -m vegas_dropship roi --product neck-fan
    python3 -m vegas_dropship suppliers --product pool-float
    python3 -m vegas_dropship report --out reports/vegas-dropship-report.md
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .economics import VOLUMES, analyze_channels
from .loader import load_market, load_products, load_suppliers, validate_references
from .report import generate_report
from .scoring import rank_products


def _load_all():
    products = load_products()
    suppliers = load_suppliers()
    market = load_market()
    validate_references(products, suppliers)
    return products, suppliers, market


def cmd_analyze(_: argparse.Namespace) -> int:
    products, _suppliers, market = _load_all()
    scored = rank_products(products, market["scoring"])
    print(f"{'#':>2}  {'OPP':>5}  {'DEMAND':>6}  {'UNDSVC':>6}  {'VEGAS':>5}  {'MARGIN':>6}  PRODUCT")
    for i, (p, s) in enumerate(scored, 1):
        print(f"{i:>2}  {s.opportunity:>5.1f}  {s.demand:>6.0f}  {s.underservice:>6.0f}"
              f"  {s.vegas:>5.0f}  {s.margin:>6.0f}  {p.name}  [{p.id}]")
    print("\nOPP = 35% demand + 30% under-service + 20% Vegas fit + 15% margin (see data/market.json)")
    return 0


def cmd_roi(args: argparse.Namespace) -> int:
    products, _suppliers, market = _load_all()
    by_id = {p.id: p for p in products}
    if args.product not in by_id:
        print(f"unknown product {args.product!r}; available: {', '.join(sorted(by_id))}", file=sys.stderr)
        return 2
    p = by_id[args.product]
    print(f"{p.name}  (${p.retail_price:.2f} retail, {p.size_tier}, {p.unit_weight_lb} lb)\n")
    for r in analyze_channels(p, market):
        print(f"== {r.label}  ({r.delivery_days[0]:g}-{r.delivery_days[1]:g} days to Vegas buyer)")
        for k, v in r.cost_detail.items():
            print(f"   {k:<28} ${v:>8.2f}")
        print(f"   {'revenue (net of returns)':<28} ${r.revenue_per_unit:>8.2f}")
        print(f"   {'contribution / unit':<28} ${r.contribution_per_unit:>8.2f}  ({r.contribution_margin_pct:.0f}% of price)")
        print(f"   {'fixed / month':<28} ${r.fixed_monthly:>8.2f}")
        for v in VOLUMES:
            print(f"   {'profit @ ' + str(v) + '/mo':<28} ${r.monthly_profit[v]:>8.2f}")
        if r.upfront_capital:
            payback = f"{r.payback_months:.1f} mo" if r.payback_months else "n/a"
            roi = f"{r.roi_12mo_pct:,.0f}%" if r.roi_12mo_pct is not None else "n/a"
            print(f"   {'upfront capital':<28} ${r.upfront_capital:>8.2f}   payback {payback}, 12-mo ROI {roi}")
        print()
    return 0


def cmd_suppliers(args: argparse.Namespace) -> int:
    products, suppliers, _market = _load_all()
    if args.product:
        by_id = {p.id: p for p in products}
        if args.product not in by_id:
            print(f"unknown product {args.product!r}", file=sys.stderr)
            return 2
        wanted = set(by_id[args.product].supplier_ids)
        suppliers = [s for s in suppliers if s.id in wanted]
    for s in suppliers:
        lo, hi = s.ship_to_vegas_days
        print(f"- {s.name} [{s.type}] — {lo:g}-{hi:g} days to Vegas; MOQ {s.moq}")
        print(f"    {s.cost_profile}")
    return 0


def cmd_report(args: argparse.Namespace) -> int:
    products, suppliers, market = _load_all()
    md = generate_report(products, suppliers, market, top_n=args.top)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(md, encoding="utf-8")
    print(f"wrote {out} ({len(md):,} chars, top {args.top} deep-dives)")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="vegas_dropship",
        description="Rank trending dropship products by Las Vegas delivery under-service and model channel ROI.")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("analyze", help="print the ranked opportunity table").set_defaults(func=cmd_analyze)

    roi = sub.add_parser("roi", help="per-channel unit economics for one product")
    roi.add_argument("--product", required=True, help="product id (see analyze output)")
    roi.set_defaults(func=cmd_roi)

    sup = sub.add_parser("suppliers", help="list suppliers, optionally for one product")
    sup.add_argument("--product", default=None)
    sup.set_defaults(func=cmd_suppliers)

    rep = sub.add_parser("report", help="write the full markdown report")
    rep.add_argument("--out", default="reports/vegas-dropship-report.md")
    rep.add_argument("--top", type=int, default=6, help="number of deep-dive products")
    rep.set_defaults(func=cmd_report)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
