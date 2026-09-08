#!/usr/bin/env python3
"""
Rolling MAD (Median Absolute Deviation) & Statistical Anomaly Detector (Pillar I).

Consumes read-only time-series metrics or export dumps from Cloudflare D1
and detects sudden volume collapses, abnormal-zero yields, or latency spikes.
Uses standard library statistics for dependency-free execution.
"""

from __future__ import annotations

import argparse
import json
import math
import statistics
import sys
from typing import Any, Dict, List, Optional, Tuple


def calculate_median(values: List[float]) -> float:
    if not values:
        return 0.0
    return float(statistics.median(values))


def calculate_mad(values: List[float], median: Optional[float] = None) -> float:
    """Calculate Median Absolute Deviation (MAD)."""
    if not values:
        return 0.0
    med = median if median is not None else calculate_median(values)
    deviations = [abs(x - med) for x in values]
    return float(statistics.median(deviations))


def detect_mad_anomalies(
    values: List[float],
    threshold: float = 3.5,
) -> List[Dict[str, Any]]:
    """
    Computes Boris Iglewicz and David Hoaglin (1993) modified Z-scores based on MAD:
    M_i = 0.6745 * (x_i - median) / MAD
    Flags data points where |M_i| > threshold.
    """
    if len(values) < 3:
        return []

    med = calculate_median(values)
    mad = calculate_mad(values, med)

    anomalies: List[Dict[str, Any]] = []
    for idx, val in enumerate(values):
        if mad > 0:
            modified_z = 0.6745 * (val - med) / mad
        else:
            mean_dev = statistics.mean([abs(x - med) for x in values])
            modified_z = (val - med) / (mean_dev * 1.2533) if mean_dev > 0 else 0.0

        if abs(modified_z) > threshold:
            anomalies.append({
                "index": idx,
                "value": val,
                "median": med,
                "mad": mad,
                "modified_z_score": round(modified_z, 4),
                "direction": "spike" if modified_z > 0 else "collapse",
            })
    return anomalies


def detect_volume_collapse(
    recent_volume: float,
    history: List[float],
    collapse_ratio_threshold: float = 0.20,
) -> Optional[Dict[str, Any]]:
    """
    Detects if recent volume has collapsed to less than collapse_ratio_threshold
    (default 20%) of the historical rolling median.
    """
    if not history:
        return None
    med = calculate_median(history)
    if med <= 0:
        return None

    ratio = recent_volume / med
    if ratio < collapse_ratio_threshold:
        return {
            "recent_volume": recent_volume,
            "historical_median": med,
            "ratio": round(ratio, 4),
            "collapsed": True,
            "severity": "CRITICAL" if recent_volume == 0 else "WARNING",
        }
    return None


def run_analysis(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Processes a structured batch of source time-series metrics.
    Expected format:
    {
      "sources": {
        "we-work-remotely": [120, 115, 118, 110, 122, 119, 15],
        "remotive": [25, 24, 26, 28, 24, 25, 26]
      }
    }
    """
    sources_report: Dict[str, Any] = {}
    total_anomalies = 0

    for source_id, series in data.get("sources", {}).items():
        float_series = [float(x) for x in series]
        if not float_series:
            continue

        anomalies = detect_mad_anomalies(float_series)
        history = float_series[:-1] if len(float_series) > 1 else float_series
        latest = float_series[-1]
        collapse = detect_volume_collapse(latest, history)

        sources_report[source_id] = {
            "observations_count": len(float_series),
            "latest_value": latest,
            "rolling_median": calculate_median(float_series),
            "mad": calculate_mad(float_series),
            "anomalies": anomalies,
            "volume_collapse": collapse,
        }
        total_anomalies += len(anomalies)

    return {
        "analyzed_sources": len(sources_report),
        "total_anomalies_detected": total_anomalies,
        "sources": sources_report,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Rolling MAD Anomaly Detector")
    parser.add_argument("input_file", nargs="?", help="Path to input JSON file (or stdin)")
    args = parser.parse_args()

    if args.input_file:
        with open(args.input_file, "r", encoding="utf-8") as f:
            raw_data = json.load(f)
    else:
        raw_data = json.load(sys.stdin)

    result = run_analysis(raw_data)
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
