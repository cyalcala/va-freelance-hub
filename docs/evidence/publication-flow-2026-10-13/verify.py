"""Offline integrity and arithmetic replay; not independent live verification."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def read(name):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def check(condition, message):
    if not condition:
        raise ValueError(message)


captures = {
    "authenticated-initial-denial.json",
    "public-initial-surface.json",
    "authenticated-state.json",
    "public-surface.json",
    "followup.json",
}
manifest = read("integrity.json")
check(manifest["algorithm"] == "SHA-256", "Unexpected hash algorithm")
check({f["file"] for f in manifest["files"]} == captures, "Capture set differs")
check(len(manifest["files"]) == len(captures), "Duplicate manifest entries")
for entry in manifest["files"]:
    data = (ROOT / entry["file"]).read_bytes()
    check(hashlib.sha256(data).hexdigest() == entry["sha256"], entry["file"])
    check(len(data) == entry["utf8Bytes"], entry["file"] + " byte length")

state = read("authenticated-state.json")
followup = read("followup.json")
queries = 0
for observation in state["observations"] + followup["observations"]:
    if "query" not in observation:
        continue
    queries += 1
    check(observation["query"].lstrip().upper().startswith("SELECT ") or
          (observation["kind"] == "today-ledger-unique-ids" and
           observation["query"].startswith("WITH receipt_ids AS (SELECT ")),
          "Unexpected query form")
    payload = json.dumps(
        {"sql": observation["query"], "params": observation["params"]},
        ensure_ascii=False, separators=(",", ":"),
    ).encode("utf-8")
    check(hashlib.sha256(payload).hexdigest() == observation["querySha256"],
          observation["kind"] + " query hash")
    for result in observation.get("results", []):
        check(result["success"] and result["rowsWritten"] == 0,
              observation["kind"] + " SELECT result")
check(queries == 15, "SQL observation count")


def rows(kind, document=state):
    matches = [o for o in document["observations"] if o.get("kind") == kind]
    check(len(matches) == 1, "Missing or duplicate " + kind)
    return matches[0]["results"][0]["rows"]


inventory = rows("inventory")[0]
expected_inventory = {
    "stored_total": 7257, "public_total": 1661, "stored_firstseen_today": 33,
    "public_firstseen_today": 22, "public_verified_label_firstseen_today": 1,
    "public_sourceposted_today": 20, "public_future_sourceposted": 0,
}
check(all(inventory[k] == v for k, v in expected_inventory.items()), "Inventory")
ledger = rows("today-ledger-shape")
for key, expected in (("receipts", 19), ("reported_published", 22),
                      ("id_occurrences", 13), ("count_id_disagreement_receipts", 6)):
    check(sum(r[key] for r in ledger) == expected, "Ledger " + key)
named = rows("today-ledger-id-records", followup)
check(len(named) == len({r["opportunity_id"] for r in named}) == 13, "Named IDs")
check(all(r["receipt_source_id"] == r["stored_source_id"] and r["is_active"] == 1
          and r["location_type"] == "remote" and r["last_verified_at"] is None
          for r in named), "Named ID state")

authority = rows("workable-authority")
check(len(authority) == 7, "Canary source count")
for kind, skips in (("source-events-60min", 6), ("source-events-24h", 111)):
    events = {r["source_id"]: r for r in rows(kind)}
    for source in authority:
        event = events[source["source_id"]]
        check(event["fetched_events"] == 0 and event["rotation_skips"] == skips,
              kind + " " + source["source_id"])

surface = read("public-surface.json")
today = next(o for o in surface["observations"] if o["path"] == "/opportunities?fresh=today")
public_ids = {r["id"] for r in rows("today-public-ids")}
check(len(public_ids) == 22 and today["counts"] == [21], "Today counts")
check(public_ids - set(today["renderedJobIds"]) == {9214}, "Missing public ID")
check(not set(today["renderedJobIds"]) - public_ids, "Unexpected today ID")
details = {o["path"]: o for o in followup["observations"] if o.get("kind") == "public-detail"}
check(details["/jobs/9214"]["status"] == 404, "Missing detail response")
check(details["/jobs/9191"]["status"] == 200, "Comparison detail response")
print("PASS: 5 capture hashes, 15 SELECT hashes, zero successful SELECT writes;")
print("inventory 7257/1661, day 33/22/1/20; ledger 19 receipts/22 reported/13 IDs/6 disagreements;")
print("7 canaries each 0 fetches and 6/111 rotation skips; public missing ID 9214 returns 404.")
print("Scope: offline retained evidence only. Certified daily throughput UNKNOWN; MATH 0/13.")
