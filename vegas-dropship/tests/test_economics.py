import unittest

from vegas_dropship.economics import (analyze_channels, best_channel,
                                      shopify_dropship, shopify_vegas_3pl,
                                      amazon_fba, _fba_fulfillment_fee)
from vegas_dropship.loader import load_market

from test_scoring import make_product


class TestEconomics(unittest.TestCase):
    def setUp(self):
        self.market = load_market()

    def test_china_dropship_known_values(self):
        """Hand-computed check: price 30, cogs 6, ship 4, fee 2.9%*30+0.30=1.17,
        cac 8, revenue 30*(1-0.03)=29.10 -> contribution 29.10-19.17=9.93."""
        p = make_product()
        r = shopify_dropship(p, self.market, us_warehouse=False)
        self.assertAlmostEqual(r.revenue_per_unit, 29.10, places=2)
        self.assertAlmostEqual(r.variable_cost_per_unit, 19.17, places=2)
        self.assertAlmostEqual(r.contribution_per_unit, 9.93, places=2)
        self.assertEqual(r.upfront_capital, 0.0)
        self.assertIsNone(r.roi_12mo_pct)

    def test_monthly_profit_includes_fixed(self):
        p = make_product()
        r = shopify_dropship(p, self.market, us_warehouse=False)
        # fixed = 39 + 60 = 99; at 100 units: 9.93*100 - 99 = 894.00
        self.assertAlmostEqual(r.monthly_profit[100], 894.00, places=1)

    def test_3pl_has_capital_and_payback(self):
        p = make_product()
        r = shopify_vegas_3pl(p, self.market)
        # capital = 300 * (4 + 1) = 1500
        self.assertAlmostEqual(r.upfront_capital, 1500.0, places=2)
        self.assertIsNotNone(r.payback_months)
        self.assertGreater(r.roi_12mo_pct, 0)

    def test_fba_fee_tiers_and_fuel_surcharge(self):
        fba = self.market["channels"]["amazon_fba"]
        small = make_product(size_tier="small_standard")
        self.assertAlmostEqual(_fba_fulfillment_fee(small, fba, include_fuel_surcharge=False),
                               3.42, places=2)
        self.assertAlmostEqual(_fba_fulfillment_fee(small, fba),
                               3.42 * 1.035, places=3)
        heavy = make_product(size_tier="large_standard", unit_weight_lb=2.5)
        self.assertAlmostEqual(_fba_fulfillment_fee(heavy, fba, include_fuel_surcharge=False),
                               6.97, places=2)
        bulky = make_product(size_tier="large_bulky", unit_weight_lb=6.0)
        self.assertAlmostEqual(_fba_fulfillment_fee(bulky, fba, include_fuel_surcharge=False),
                               10.19, places=2)

    def test_fba_referral_scales_with_price(self):
        p = make_product(retail_price=100.0)
        r = amazon_fba(p, self.market)
        self.assertAlmostEqual(r.cost_detail["referral_fee"], 15.0, places=2)

    def test_analyze_returns_all_four_channels(self):
        p = make_product()
        results = analyze_channels(p, self.market)
        self.assertEqual(len(results), 4)
        self.assertEqual({r.channel for r in results},
                         {"shopify_china_dropship", "shopify_us_dropship",
                          "shopify_vegas_3pl", "amazon_fba"})

    def test_best_channel_prefers_higher_profit(self):
        p = make_product()
        results = analyze_channels(p, self.market)
        best = best_channel(results)
        top_profit = max(r.monthly_profit[300] for r in results)
        self.assertEqual(best.monthly_profit[300], top_profit)

    def test_delivery_faster_for_local_channels(self):
        p = make_product()
        by_channel = {r.channel: r for r in analyze_channels(p, self.market)}
        self.assertLess(by_channel["shopify_vegas_3pl"].delivery_days[1],
                        by_channel["shopify_china_dropship"].delivery_days[0])
        self.assertLessEqual(by_channel["amazon_fba"].delivery_days[1], 2)


if __name__ == "__main__":
    unittest.main()
