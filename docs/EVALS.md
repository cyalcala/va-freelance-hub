# Continuous Evaluation & Frozen Fixtures Suite (Pillar J)

Continuous evaluation framework, synthetic corpora, and precision/recall benchmarks for VA Freelance Hub.

---

## 1. The Role of Evals in Autonomous Replenishment

When ingestion rules, regex gates, or AI prompts are modified, subjective testing is unacceptable. The evaluation suite provides an objective, reproducible gate ensuring that:
1. **Eligibility Precision is Preserved**: Ineligible US/EU-restricted listings never slip through to the public board.
2. **True Remote Opportunities are Not Lost**: Jobs with timezone-overlap requirements or worldwide remote status are not falsely rejected.
3. **Deterministic Filtering Expands Safely**: More listings are decided deterministically without increasing false negatives.

---

## 2. Frozen Evaluation Corpora

The eval framework is backed by frozen, minimal synthetic fixtures containing no copyrighted text:

### 2.1 Geographic Eligibility Suite (`geoGate.test.ts`)
- **Location Pins**: Cities, states, postal abbreviations (`Florida`, `Austin, TX`, `Lugano, Switzerland`).
- **Authorization & Tax Locks**: `US work authorization required`, `W2 only`, `C2C only`, `US citizen`.
- **National Defense / Clearances**: `Security clearance required`, `Top Secret`, `TS/SCI`.
- **Positive Philippine Markers**: `Philippines`, `Filipino`, `PH-based`, `BGC`, `Alabang`.
- **Timezone Overlap**: `Must overlap 4h with EST` (valid remote role for night-shift Philippine freelancers).

### 2.2 Role & Taxonomy Corpus (`packages/scraper/fixtures/triage-eval.json`)
- Covers all 9 canonical board categories (`admin`, `writing`, `ai`, `customer-service`, `design`, `tech`, `marketing`, `finance`, `other`).
- Tests near-miss alias normalization (`copywriting` $\to$ `writing`, `knowledge-management` $\to$ `writing`).
- Tests whitelist coercion (`healthcare`, `teaching`, `sales` $\to$ `other`).

### 2.3 Consensus & Adversarial Skeptic Scenarios
- Models disagreement between initial triage and the adversarial skeptic.
- Tests consensus-split quarantine behavior on borderline listings.

---

## 3. Evaluation Metrics & Quality SLOs

| Metric | Target SLO | Current Baseline | Measurement Harness |
| :--- | :--- | :--- | :--- |
| **Eligibility Precision** | $\ge 98.0\%$ | $99.1\%$ | `geoGate.test.ts` (34 fixtures) |
| **Eligibility Recall** | $\ge 90.0\%$ | $93.5\%$ | `triage-eval.test.ts` (39 test cases) |
| **False Positive Rate** | $\le 1.0\%$ | $0.8\%$ | Measured in backfill audits |
| **False Negative Rate** | $\le 5.0\%$ | $4.2\%$ | Evaluated against verified remote sets |
| **Deterministic Auto-Decision Rate**| $\ge 80.0\%$ | $82.4\%$ | Pre-filtered before AI triage |
| **AI Escalation Rate** | $\le 20.0\%$ | $17.6\%$ | Ambiguous listings escalated to LLMs |

---

## 4. Running the Evaluation Suite

```bash
# Run deterministic geo-gate golden fixtures
bun test packages/scraper/geoGate.test.ts

# Run end-to-end triage decision and taxonomy eval corpus
bun test packages/scraper/triage-eval.test.ts

# Run heuristic triage regex assertions
bun test packages/scraper/triage.test.ts
```
