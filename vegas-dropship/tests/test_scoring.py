import unittest

from vegas_dropship.loader import load_market, load_products
from vegas_dropship.models import Product
from vegas_dropship.scoring import (margin_score, rank_products, score_product,
                                    underservice_score, vegas_score)


def make_product(**overrides) -> Product:
    base = dict(
        id="test", name="Test", category="test", retail_price=30.0,
        cogs_china=6.0, cogs_bulk=4.0, cogs_us_dropship=9.0,
        freight_in_per_unit=1.0, unit_weight_lb=0.5, size_tier="small_standard",
        dropship_ship_china=4.0, dropship_ship_us=5.0, amazon_referral_pct=0.15,
        returns_rate=0.03, cac=8.0, amazon_ad_pct=0.1, demand_score=70,
        demand_rationale="", vegas_fit=1.2, vegas_rationale="",
        dominant_offer_delivery_days=(10.0, 20.0), delivery_rationale="",
        seasonality="", risk_notes="", supplier_ids=[], sources=[],
    )
    base.update(overrides)
    return Product(**base)


class TestScoring(unittest.TestCase):
    def setUp(self):
        self.cfg = load_market()["scoring"]

    def test_underservice_zero_when_fast(self):
        p = make_product(dominant_offer_delivery_days=(1.0, 2.0))
        self.assertEqual(underservice_score(p, 2.0, 18.0), 0.0)

    def test_underservice_monotonic_in_gap(self):
        slow = make_product(dominant_offer_delivery_days=(15.0, 25.0))
        fast = make_product(dominant_offer_delivery_days=(3.0, 6.0))
        self.assertGreater(underservice_score(slow, 2.0, 18.0),
                           underservice_score(fast, 2.0, 18.0))

    def test_underservice_caps_at_100(self):
        p = make_product(dominant_offer_delivery_days=(30.0, 60.0))
        self.assertEqual(underservice_score(p, 2.0, 18.0), 100.0)

    def test_vegas_score_maps_range(self):
        lo = make_product(vegas_fit=0.8)
        hi = make_product(vegas_fit=1.6)
        self.assertEqual(vegas_score(lo, (0.8, 1.6)), 0.0)
        self.assertEqual(vegas_score(hi, (0.8, 1.6)), 100.0)

    def test_margin_score_zero_when_underwater(self):
        p = make_product(retail_price=8.0, cogs_china=6.0, dropship_ship_china=4.0)
        self.assertEqual(margin_score(p, 0.7), 0.0)

    def test_weights_must_sum_to_one(self):
        bad = dict(self.cfg, weights={"demand": 0.5, "underservice": 0.5,
                                      "vegas_fit": 0.5, "margin": 0.5})
        with self.assertRaises(ValueError):
            score_product(make_product(), bad)

    def test_opportunity_bounded(self):
        s = score_product(make_product(), self.cfg)
        self.assertGreaterEqual(s.opportunity, 0.0)
        self.assertLessEqual(s.opportunity, 100.0)

    def test_real_catalog_controls_rank_low(self):
        """The well-serviced control (magsafe-mount) must rank below the
        heat-relief leaders despite comparable demand."""
        products = load_products()
        ranked = rank_products(products, self.cfg)
        order = [p.id for p, _ in ranked]
        self.assertLess(order.index("neck-fan"), order.index("magsafe-mount"))
        self.assertLess(order.index("misting-fan"), order.index("mini-projector"))


if __name__ == "__main__":
    unittest.main()
