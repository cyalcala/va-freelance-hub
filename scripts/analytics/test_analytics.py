#!/usr/bin/env python3
"""
Unit tests for Python analytical tooling (Pillar I).
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from anomaly_detector import (
    calculate_median,
    calculate_mad,
    detect_mad_anomalies,
    detect_volume_collapse,
    run_analysis,
)
from yield_model import (
    calculate_concentration_hhi,
    evaluate_source_economics,
    analyze_portfolio,
)


class TestAnomalyDetector(unittest.TestCase):
    def test_median_and_mad(self):
        values = [10.0, 12.0, 11.0, 13.0, 10.0, 100.0]
        med = calculate_median(values)
        self.assertEqual(med, 11.5)
        mad = calculate_mad(values, med)
        self.assertGreater(mad, 0.0)

    def test_detect_mad_anomalies(self):
        # Series with a clear spike (120) and steady normal series (~20)
        series = [20.0, 21.0, 19.0, 20.0, 22.0, 20.0, 120.0]
        anomalies = detect_mad_anomalies(series, threshold=3.5)
        self.assertEqual(len(anomalies), 1)
        self.assertEqual(anomalies[0]["value"], 120.0)
        self.assertEqual(anomalies[0]["direction"], "spike")

    def test_detect_volume_collapse(self):
        history = [100.0, 105.0, 98.0, 102.0, 101.0]
        # Drop to 10 is < 20% of ~100
        collapse = detect_volume_collapse(10.0, history, collapse_ratio_threshold=0.20)
        self.assertIsNotNone(collapse)
        self.assertTrue(collapse["collapsed"])
        self.assertEqual(collapse["severity"], "WARNING")

        # Zero drop is CRITICAL
        zero_collapse = detect_volume_collapse(0.0, history)
        self.assertIsNotNone(zero_collapse)
        self.assertEqual(zero_collapse["severity"], "CRITICAL")

        # Normal value does not trigger collapse
        no_collapse = detect_volume_collapse(95.0, history)
        self.assertIsNone(no_collapse)

    def test_run_analysis_batch(self):
        data = {
            "sources": {
                "source-a": [50, 52, 49, 51, 50, 5],  # collapse
                "source-b": [10, 11, 10, 12, 10, 11],  # stable
            }
        }
        res = run_analysis(data)
        self.assertEqual(res["analyzed_sources"], 2)
        self.assertIsNotNone(res["sources"]["source-a"]["volume_collapse"])
        self.assertIsNone(res["sources"]["source-b"]["volume_collapse"])


class TestYieldModel(unittest.TestCase):
    def test_concentration_hhi(self):
        # Monopolistic: 1 source has 100% -> HHI 10000
        self.assertEqual(calculate_concentration_hhi([100.0]), 10000.0)

        # Equal duopoly: 50% / 50% -> HHI 5000
        self.assertEqual(calculate_concentration_hhi([50.0, 50.0]), 5000.0)

        # Diversified 10 sources: 10% each -> HHI 1000
        ten_equal = [10.0] * 10
        self.assertEqual(calculate_concentration_hhi(ten_equal), 1000.0)

    def test_evaluate_source_economics(self):
        source = {
            "source_id": "greenhouse:gitlab",
            "successful_fetches": 100,
            "raw_jobs_seen": 200,
            "eligible_jobs": 15,
            "newly_inserted_jobs": 12,
            "rejected_jobs": 180,
            "duplicate_jobs": 8,
            "ai_calls": 24,
        }
        econ = evaluate_source_economics(source)
        self.assertEqual(econ["eligible_yield"], 0.15)
        self.assertEqual(econ["productive_yield"], 0.12)
        self.assertEqual(econ["ai_cost_per_insert"], 2.0)
        self.assertIn("CLASS_1", econ["recommended_polling_class"])

    def test_portfolio_analysis(self):
        sources = [
            {"source_id": "s1", "raw_jobs_seen": 8000, "successful_fetches": 100, "newly_inserted_jobs": 5},
            {"source_id": "s2", "raw_jobs_seen": 2000, "successful_fetches": 100, "newly_inserted_jobs": 2},
        ]
        res = analyze_portfolio(sources)
        self.assertEqual(res["total_sources_evaluated"], 2)
        self.assertGreater(res["concentration_hhi"], 2500)
        self.assertEqual(res["concentration_status"], "HIGHLY_CONCENTRATED_FRAGILE")


if __name__ == "__main__":
    unittest.main()
