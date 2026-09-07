#!/usr/bin/env python3
"""
Source Economics & Yield Portfolio Modeler (Pillar I / Section 21).

Models source yield, waste ratios, Herfindahl-Hirschman Index (HHI)
concentration, and adaptive polling cadences from read-only telemetry.
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any, Dict, List, Tuple


def calculate_concentration_hhi(shares: List[float]) -> float:
    """
    Computes Herfindahl-Hirschman Index (HHI) for source concentration.
    shares: list of percentage shares (0 to 100).
    HHI < 1500: Diversified (Healthy)
    1500 <= HHI <= 2500: Moderate Concentration
    HHI > 2500: Highly Concentrated (Fragile)
    """
    total = sum(shares)
    if total <= 0:
        return 0.0
    normalized_shares = [(s / total) * 100.0 for s in shares]
    return round(sum(s * s for s in normalized_shares), 2)


def evaluate_source_economics(source: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates economic yield metrics for a single source:
    - eligible_yield: eligible_jobs / successful_fetches
    - productive_yield: newly_inserted_jobs / successful_fetches
    - waste_ratio: (rejected + duplicate) / raw_jobs
    - ai_cost_per_insert: ai_calls / newly_inserted_jobs
    """
    fetches = max(1, source.get("successful_fetches", 1))
    raw_jobs = max(1, source.get("raw_jobs_seen", 1))
    eligible_jobs = source.get("eligible_jobs", 0)
    inserted_jobs = source.get("newly_inserted_jobs", 0)
    rejected_jobs = source.get("rejected_jobs", 0)
    duplicate_jobs = source.get("duplicate_jobs", 0)
    ai_calls = source.get("ai_calls", 0)

    eligible_yield = round(eligible_jobs / fetches, 4)
    productive_yield = round(inserted_jobs / fetches, 4)
    waste_ratio = round((rejected_jobs + duplicate_jobs) / raw_jobs, 4)
    ai_cost_per_insert = round(ai_calls / max(1, inserted_jobs), 2) if inserted_jobs > 0 else 0.0

    # Recommended polling class based on productivity
    if productive_yield >= 0.10:
        polling_class = "CLASS_1_HIGH_VELOCITY (every 10-15m)"
    elif productive_yield >= 0.02:
        polling_class = "CLASS_2_STANDARD (every 1-2h)"
    elif productive_yield > 0.0:
        polling_class = "CLASS_3_LOW_CADENCE (every 6-12h)"
    else:
        polling_class = "CLASS_4_BACKOFF_QUARANTINE (hourly check / dormant)"

    return {
        "source_id": source.get("source_id", "unknown"),
        "eligible_yield": eligible_yield,
        "productive_yield": productive_yield,
        "waste_ratio": waste_ratio,
        "ai_cost_per_insert": ai_cost_per_insert,
        "recommended_polling_class": polling_class,
    }


def analyze_portfolio(sources: List[Dict[str, Any]]) -> Dict[str, Any]:
    evaluated = [evaluate_source_economics(s) for s in sources]
    volume_shares = [float(s.get("raw_jobs_seen", 0)) for s in sources]
    hhi = calculate_concentration_hhi(volume_shares)

    concentration_eval = "HEALTHY_DIVERSIFIED"
    if hhi > 2500:
        concentration_eval = "HIGHLY_CONCENTRATED_FRAGILE"
    elif hhi >= 1500:
        concentration_eval = "MODERATE_CONCENTRATION"

    return {
        "total_sources_evaluated": len(evaluated),
        "concentration_hhi": hhi,
        "concentration_status": concentration_eval,
        "sources": evaluated,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Source Yield & Economics Portfolio Analyzer")
    parser.add_argument("input_file", nargs="?", help="Path to input JSON file (or stdin)")
    args = parser.parse_args()

    if args.input_file:
        with open(args.input_file, "r", encoding="utf-8") as f:
            raw_data = json.load(f)
    else:
        raw_data = json.load(sys.stdin)

    sources_list = raw_data if isinstance(raw_data, list) else raw_data.get("sources", [])
    report = analyze_portfolio(sources_list)
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
