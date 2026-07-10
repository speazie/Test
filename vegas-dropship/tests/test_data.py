import unittest

from vegas_dropship.loader import (load_market, load_products, load_suppliers,
                                   validate_references)


class TestData(unittest.TestCase):
    def test_catalog_loads_and_validates(self):
        products = load_products()
        suppliers = load_suppliers()
        validate_references(products, suppliers)
        self.assertGreaterEqual(len(products), 12)
        self.assertGreaterEqual(len(suppliers), 8)

    def test_every_product_cites_sources_and_suppliers(self):
        for p in load_products():
            self.assertTrue(p.sources, f"{p.id} has no sources")
            self.assertTrue(p.supplier_ids, f"{p.id} has no suppliers")

    def test_prices_and_costs_sane(self):
        for p in load_products():
            self.assertGreater(p.retail_price, p.cogs_china, p.id)
            self.assertGreater(p.cogs_china, p.cogs_bulk, p.id)
            self.assertGreater(p.cogs_us_dropship, p.cogs_china, p.id)
            self.assertTrue(0 <= p.returns_rate < 0.2, p.id)
            self.assertTrue(0.8 <= p.vegas_fit <= 1.6, p.id)
            self.assertTrue(0 <= p.demand_score <= 100, p.id)

    def test_market_config_complete(self):
        market = load_market()
        self.assertIn("scoring", market)
        self.assertIn("vegas_market", market)
        for ch in ("shopify_common", "vegas_3pl", "amazon_fba"):
            self.assertIn(ch, market["channels"])
        for ch in ("shopify_china_dropship", "shopify_us_dropship",
                   "shopify_vegas_3pl", "amazon_fba"):
            self.assertIn(ch, market["channel_delivery_days"])

    def test_vegas_3pls_present(self):
        types = {s.type for s in load_suppliers()}
        self.assertIn("vegas-3pl", types)
        self.assertIn("wholesale-manufacturer", types)


if __name__ == "__main__":
    unittest.main()
